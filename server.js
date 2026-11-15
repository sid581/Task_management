// import 'dotenv/config'
// // dotenv.config()
// import app from './app.js'
// import pool from './src/config/database.js'


// const startserver=async () => {
    
//     try {
//         await pool.query("select 1")
//         console.log("Database executed sucessfully")
        
//         app.listen(process.env.PORT,()=>{
//             console.log("server running on port",process.env.PORT)
//         })
//     } catch (error) {
//         console.log("database connection failed",error)
//         process.exit(1)
//     }
// }

// startserver()
import 'dotenv/config'
import app from "./app.js";
import sequelize from "./src/config/database.js";


const startServer=async()=>{
    try {
        await sequelize.authenticate()
        console.log("postgresSQL connected with sequelize");

        await sequelize.sync()
        console.log("Tables syncronized");
        

        app.listen(process.env.PORT,()=>{
            console.log("server running on port",process.env.PORT);
        })
    } catch (error) {
        console.log("Database connection failed");
    }
}

startServer()

