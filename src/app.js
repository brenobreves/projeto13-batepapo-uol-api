import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";

const app = express();
app.use(cors());
app.use(express.json());


const mongoClient = new MongoClient("mongodb://localhost:27017/Uol");

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
app.post("/participants", (req,res) => {
    const {name} = req.body;
    db.collection("participants").findOne({name: name})
        .then( exists => {
            if(exists){
                return res.sendStatus(409)
            }
            const novoParticipant = {
                name: name,
                lastStatus: Date.now()
            }
            db.collection("participants").insertOne(novoParticipant)
                .then(() => {
                    const novoParticipantMsg = {
                        from: name,
                        to: 'Todos',
                        text: 'entra na sala...',
                        type: 'status',
                        time: dayjs().format('HH:mm:ss')
                    }
                    db.collection("messages").insertOne(novoParticipantMsg)
                        .then(() => {
                            return res.sendStatus(201)
                        })
                        .catch(err => {
                            return res.status(500).send(err.message)
                        })
                })
                .catch(err => {
                    return res.status(500).send(err.message)
                })

        })
        .catch(err => {
            return res.status(500).send(err.message)
        })
})

const PORT = 5000;
app.listen(PORT , () => console.log(`App rodando na porta ${PORT}`));

