import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import dotenv from "dotenv";

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();


const mongoClient = new MongoClient(process.env.DATABASE_URL);

let db;

mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch((err) => console.log(err.message))

//Get participants 
app.get("/participants", (req,res) => {
    db.collection("participants").find().toArray()
    .then( participants => {
        return res.send(participants)
    })
    .catch(err => {
        return res.status(500).send(err.message)
    })

});

//Post participants
app.post("/participants", async(req,res) => {
    const {name} = req.body;
    try {
        const participant = await db.collection("participants").findOne({name: name})
        if(participant) return res.sendStatus(409)
        
        const novoParticipant = {
            name: name,
            lastStatus: Date.now()
        }
        
        await db.collection("participants").insertOne(novoParticipant)
        
        const novoParticipantMsg = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        }
        await db.collection("messages").insertOne(novoParticipantMsg)    
        return res.sendStatus(201)        
    } catch (err) {
        return res.status(500).send(err.message)
    }
})

const PORT = 5000;
app.listen(PORT , () => console.log(`App rodando na porta ${PORT}`));

