const express = require("express")
const app = express()
const ejs = require("ejs")
const ejsLayouts = require('express-ejs-layouts')
const path = require("path")

app.use(ejsLayouts)

app.set('view engine','ejs')
app.set('views',path.join(__dirname,"views"))
app.set('layout', 'layouts/main');
app.use(express.static(path.join(__dirname,"public")))

app.get('/signup',(req,res)=>{
    try{
        res.status(200).render('signup',{layout:false})
    }catch{
        console.log(err);
        res.status(500).send("Something went wrong");
    }
});
app.get('/login',(req,res)=>{
    try{
        res.status(200).render('login',{layout:false})
    }catch{
        console.log(err);
        res.status(500).send("Something went wrong");
    }
});

app.get('/', (req, res) => {
    try {
        res.status(200).render('home');
    } catch (err) {
        console.error(err);
        res.status(500).send("Something went wrong");
    }
});


app.listen(3000,()=>{
    console.log("Server Started : http://localhost:3000")
})