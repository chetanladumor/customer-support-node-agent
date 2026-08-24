import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";

const router = Router();

router.get("/users", UserController.listUsers);

export default router;
