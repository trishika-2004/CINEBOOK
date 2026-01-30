const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateDetails,
} = require("../Controllers/authController");

const auth = require("../Middleware/auth");

router.post("/register", register);
router.post("/login", login);

router.get("/me", auth, getMe);
router.put("/updatedetails", auth, updateDetails);

module.exports = router;
