import pool from "../config/database.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
export const registerUser=async(req,res)=>{
    try {
        const {name,email,password,role}=req.body
        if(!name || !email || !password){
            res.status(400).json({
                success:false,
                message:"All details required"
            })
        }

        if(role &&  !["admin","employee"].includes(role)){
            res.status(400).json({
                success:false,
                message:"invalid role"
            })
        }

        const existinguser=await pool.query("select id from users where email=$1",[email])

        if(existinguser.rows.length>0){
            res.status(409).json({
                success:false,
                message:"Email already registered"
            })
        }

        const hashedPassword=await bcrypt.hash(password,10)

        const result=await pool.query(
            `INSERT INTO users (name, email, password, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role, created_at`,
            [name, email, hashedPassword, role || 'employee']
        );


        res.status(201).json({
            success:true,
            message:"user registered succesfullty",
            data:result.rows[0]
        })
    } catch (error) {
        console.log("Registration error",error)
        
        res.status(500).json({
            success:false,
            message:"Internal server Error"
        })
    }
}

export const login=async(req,res)=>{
     try {
        const { email, password } = req.body;

        // 1. Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // 2. Find user in database
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        // 3. Compare password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // 4. Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1d'
            }
        );

        // 5. Send response
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}