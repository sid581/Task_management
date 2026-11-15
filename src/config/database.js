// import pg from 'pg' 

// const {Pool}=pg

// const pool=new Pool({
//     host:process.env.DB_HOST,
//     port:process.env.DB_PORT,
//     user:process.env.DB_USER,
//     password:process.env.DB_PASSWORD,
//     database:process.env.DB_NAME,
// }) 


// pool.on('connect',()=>{
//     console.log("New database is connected");
// })

// pool.on('error',(err)=>{
//     console.log("The error is",err)
// })


// export default pool

import { Sequelize } from "sequelize";

import 'dotenv/config'

const sequelize=new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host:process.env.DB_HOST,
        port:process.env.DB_PORT,
        dialect:"postgres",
        logging:false
    }

)

export default sequelize