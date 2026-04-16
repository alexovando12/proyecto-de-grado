const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// Solo administradores pueden gestionar usuarios
router.use(auth, roleCheck(["admin"]));

router.get("/", usuarioController.obtenerUsuarios);
router.get("/:id", usuarioController.obtenerUsuario);
router.post("/", usuarioController.crearUsuario);
router.put("/:id", usuarioController.actualizarUsuario);
router.delete("/:id", usuarioController.eliminarUsuario);

module.exports = router;
