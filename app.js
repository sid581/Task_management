import express from  'express'
import userRoutes from './src/routes/userRoutes.js'
import authRoutes from './src/routes/authRoutes.js'
import taskRoutes from './src/routes/taskRoutes.js'
import loggerMiddleware from './src/middleware/loggerMiddleware.js'
import authenticateUser from './src/middleware/authMiddleware.js'
import bcrypt from 'bcrypt'

const app=express()

const h=bcrypt.hash("harsha@123",10)
h.then(h=>console.log(h))


app.use(express.json())
app.use(loggerMiddleware)
app.use('/api/users',userRoutes)
app.use('/api/auth',authRoutes)
app.use('/api/tasks',taskRoutes)
app.get('/',(req,res)=>{
    res.json({
        message:"Welcome to Home page"
    })
})


export default app;
