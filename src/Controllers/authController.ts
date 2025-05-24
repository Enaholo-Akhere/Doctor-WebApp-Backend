import { log } from "@utils/logger";
import { RegisterUserInput } from "DTO_Validations/zod_schemas";
import { Request, Response } from "express";
import { registerService } from "Services/authService";
import { UserSchemaInterface } from "types";

interface RegisterInterface {
    message: string,
    error: any,
    data: UserSchemaInterface
}

export const register = async (req: Request<{}, {}, UserSchemaInterface>, res: Response) => {

    const body: UserSchemaInterface = req.body

    // if (!body) {
    //     res.status(400).json({ message: "Please provide all fields", status: false, data: {} });
    // }

    const result = await registerService(body) as RegisterInterface;
    if (!result) {
        res.status(500).json({ message: "Registration failed", status: false, data: {} });
    }
    const { data, message, error } = result


    if (error) {
        res.status(500).json({ message, status: false, data: {} });
    }

    if (data) {
        res.status(200).json({ message, status: true, data });
    }

}

export const login = async (req: Request, res: Response) => {


    try {
        res.status(200).json({ message: "Login successful", status: true, data: {} });
    }
    catch (error: any) { }
}