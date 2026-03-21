import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
// Vercel은 /api/* 요청을 api/ 함수로 넘길 때 경로에서 /api 접두사를 떼는 경우가 있어, 루트에도 같은 라우터를 붙입니다.
app.use(router);

export default app;
