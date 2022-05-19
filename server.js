var calcRoute = require('./calcRoute')
const express = require("express");
const cors = require("cors")
const bodyParser = require ("body-parser")
const admin = require("firebase-admin")
const serviceAccount = require("./privateService.json");


const jsonParser = bodyParser.json({ limit: '10mb', extended: true });
const PORT = process.env.PORT || 5000

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://optidrive-expo-default-rtdb.firebaseio.com"
});

const app = express();
const firebaseDB = admin.database()
const ref = firebaseDB.ref()


app.use(cors())

app.post("/users",jsonParser,(req,res)=>{
  console.log(req.body)
  admin.auth().createUser({
    email:req.body.email,
    emailVerified:false,
    password:req.body.password,
    displayName:req.body.displayName,
  })
    .then(userRecord=>res.status(200).send(userRecord))
    .catch(err=> res.status(400).send({message:err.errorInfo.message}))
})
  

//POST student according to userID in FIREBASE
app.post("/students",jsonParser,(req,res)=>{
  console.log(req.query.uId)
  ref.child("users").child(req.query.uId).child("students").child(req.body.id).set(req.body)
  res.send(req.body.name)
});



//GET students according to userID in FIREBASE
app.get("/students",(req,res)=>{
  ref.child("users").child(req.query.uId).child("students").once("value",snapshot=>{
      if(snapshot.val() != null){
        res.status(200).send(snapshot.val())
        console.log(snapshot.val())
      }
      else
        res.status(404).send("no students for you")
  })
})

app.post('/routes',jsonParser,(req,res)=>{
  console.log(req.body)
})

//GET ALL Lessons from firebase according to userID
app.get("/lessons",(req,res)=>{
  ref.child("users").child(req.query.uId).child("lessons").once("value",snapshot=>{
      if(snapshot.val() != null)
        res.status(200).send(snapshot.val())
      else
        res.status(404).send("no lessons")
  })
})

//POST ALL Lessons from firebase according to userID
app.post("/lessons",jsonParser,(req,res)=>{
  console.log('Request is in server')
  ref.child("users").child(req.query.uId).child("lessons").child(req.body.date).child(req.body.hour).set(req.body)
  res.status(200).send("Added Successfully")
});


app.get("/lessons/today",(req,res)=>{
  console.log(req.query.uId)
  ref.child("users").child(req.query.uId).child("lessons").child(new Date().toISOString().split('T')[0]).once("value",snapshot=>{
    if(snapshot.val()!=null)
      res.status(200).send(snapshot.val())
    else
      res.status(404).send("There is no lessons today");
  })
})


app.post("/route",jsonParser,(req,res)=>{
  let origin=req.body.origin
  let destination=req.body.destination
  let requestedTypes=req.body.requestedTypes

  ref.child("stops").once("value",snapshot=>{
    if(snapshot.val() != null)
      calcRoute.initialRoute(origin,destination,requestedTypes,snapshot.val())
      .then(resRoute=>{
        console.log(resRoute)
        res.status(200).send(resRoute)}
        )
      .catch(err => {
        let statusCode = handleErrors(err)
        res.status(statusCode).send(err)
      })
})



})

app.post("/stops",jsonParser,(req,res)=>{
  console.log(req.query)
  ref.child("stops").child(req.query.type).push(req.body)
  res.send(req.body)
});


app.get("/getStops",(req,res)=>{
  ref.child("stops").once("value",snapshot=>{
      if(snapshot.val() != null)
        res.status(200).send(snapshot.val())
      else
        res.status(404).send("no stops")
  })
})


app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});



const handleErrors = (e) => {
  switch(e){
    case 'Initial route err':
      return 400
    case 'Best route err':
      return 404
    default: 
      return 'error';
  }
}