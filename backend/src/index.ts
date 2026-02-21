import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import generateRoute from "./routes/generate"
import simulateRoute from "./routes/simulate"
import deployRoute from "./routes/deploy"
import explainRoute from "./routes/explain"
import marketRoute from "./routes/market"

dotenv.config()

const app = express()
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"] }))
app.use(express.json({ limit: "2mb" }))

app.use("/generate", generateRoute)
app.use("/simulate", simulateRoute)
app.use("/deploy", deployRoute)
app.use("/explain", explainRoute)
app.use("/market", marketRoute)

app.get("/health", (_, res) => res.json({ status: "ok" }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Crett backend running on :${PORT}`))
