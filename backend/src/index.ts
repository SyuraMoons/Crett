import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import generateRoute from "./routes/generate"
import simulateRoute from "./routes/simulate"
import deployRoute from "./routes/deploy"
import explainRoute from "./routes/explain"
import marketRoute from "./routes/market"
import debugRoute from "./routes/debug"
import analyzeRoute from "./routes/analyze"
import creDataRoute from "./routes/cre-data"
import fixRoute from "./routes/fix"
import chatRoute from "./routes/chat"

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: "2mb" }))

app.use("/generate", generateRoute)
app.use("/simulate", simulateRoute)
app.use("/deploy", deployRoute)
app.use("/explain", explainRoute)
app.use("/market", marketRoute)
app.use("/debug", debugRoute)
app.use("/analyze", analyzeRoute)
app.use("/api/cre-data", creDataRoute)
app.use("/fix", fixRoute)
app.use("/chat", chatRoute)

app.get("/health", (_, res) => res.json({ status: "ok" }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Crett backend running on :${PORT}`))
