import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import dotenv from "dotenv";
import Joi from "joi";

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
        
        const schemaParticipant = Joi.object({
            name: Joi.string().required(),
            lastStatus: Joi.required()
        })

        const novoParticipant = {
            name: name,
            lastStatus: Date.now()
        }
        
        const validation = schemaParticipant.validate(novoParticipant, {abortEarly: false});
        if(validation.error){
            const errors = validation.error.details.map(detail => detail.message);
            return res.status(422).send(errors); 
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

//Post messages
app.post("/messages", async(req,res) => {
    const {to, text, type} = req.body;
    const from = req.headers.user;
    try {
        const participant = await db.collection("participants").findOne({name: from})
        if(!participant) return res.sendStatus(422)
        const novaMsg = {
            from,
            to,
            text,
            type,
            time: dayjs().format('HH:mm:ss')
        }
        const schemaMsg = Joi.object({
            from: Joi.required(),
            to: Joi.string().required(),
            text: Joi.string().required(),
            type: Joi.string().valid("message", "private_message").required(),
            time: Joi.required()
        })
        const validation = schemaMsg.validate(novaMsg, {abortEarly: false});
        if(validation.error){
            const errors = validation.error.details.map(detail => detail.message);
            return res.status(422).send(errors);
        }
        await db.collection("messages").insertOne(novaMsg)
        return res.sendStatus(201);
    } catch (err) {
        return res.status(500).send(err.message)
        
    }
})

//Get messages
app.get("/messages", async(req,res) => {
    const from = req.headers.user;
    let limit = req.query.limit;
    if(limit){
        limit = parseInt(limit);
        if(isNaN(limit) || limit < 1){
            return res.sendStatus(422);
        }
    }    
    try {
        const allMessages = await db.collection("messages").find({
            $or:[
                {to:from},
                {from:from},
                {to:"Todos"}
            ]
        }).toArray();
        if(!limit){
            return res.send(allMessages);
        }        
        const limitedMessages = allMessages.slice(-limit);
        return res.send(limitedMessages);
    } catch (error) {
        return res.status(500).send(err.message)
    }
})

const PORT = 5000;
app.listen(PORT , () => console.log(`App rodando na porta ${PORT}`));

