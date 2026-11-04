const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();

const ADMIN_EMAILS = ["admin@biobamboo.com.ar", "rootingdigital@gmail.com"];
const ROLES_VALIDOS = ["admin-general", "editor", "consultas"];

async function esAdminGeneral(uid) {
  if (!uid) return false;
  const u = await getAuth().getUser(uid).catch(() => null);
  if (!u) return false;
  if (ADMIN_EMAILS.includes((u.email || "").toLowerCase())) return true;
  const snap = await getFirestore().doc("usuarios/" + uid).get();
  return snap.exists && snap.data().rol === "admin-general";
}

exports.crearUsuario = onCall({region: "us-central1"}, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Hay que iniciar sesion.");
  if (!(await esAdminGeneral(req.auth.uid)))
    throw new HttpsError("permission-denied", "Solo el administrador general puede crear usuarios.");
  const {email, password, rol, nombre} = req.data || {};
  if (!email || !password || !rol) throw new HttpsError("invalid-argument", "Faltan email, contrasena o rol.");
  if (password.length < 6) throw new HttpsError("invalid-argument", "La contrasena debe tener al menos 6 caracteres.");
  if (!ROLES_VALIDOS.includes(rol)) throw new HttpsError("invalid-argument", "Rol no valido.");
  const nuevo = await getAuth().createUser({email, password, displayName: nombre || email}).catch((e) => {
    throw new HttpsError("already-exists", e.message);
  });
  await getFirestore().doc("usuarios/" + nuevo.uid).set({
    email, rol, nombre: nombre || "", creado: new Date().toISOString(),
    creadoPor: req.auth.token.email || req.auth.uid,
  });
  return {ok: true, uid: nuevo.uid};
});

exports.listarUsuarios = onCall({region: "us-central1"}, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Hay que iniciar sesion.");
  if (!(await esAdminGeneral(req.auth.uid)))
    throw new HttpsError("permission-denied", "Solo el administrador general puede listar usuarios.");
  const snap = await getFirestore().collection("usuarios").get();
  return {usuarios: snap.docs.map((d) => Object.assign({uid: d.id}, d.data()))};
});

exports.eliminarUsuario = onCall({region: "us-central1"}, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Hay que iniciar sesion.");
  if (!(await esAdminGeneral(req.auth.uid)))
    throw new HttpsError("permission-denied", "Solo el administrador general puede eliminar usuarios.");
  const {uid} = req.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "Falta el uid.");
  if (uid === req.auth.uid) throw new HttpsError("failed-precondition", "No podes eliminar tu propio usuario.");
  await getAuth().deleteUser(uid).catch(() => null);
  await getFirestore().doc("usuarios/" + uid).delete().catch(() => null);
  return {ok: true};
});
