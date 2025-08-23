import { configDotenv } from 'dotenv';
import nodemailer from 'nodemailer'

configDotenv()
 
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


export const sendMail = async (to , subject, html)=>{
    const mailOptions = {
        from : process.env.EMAIL_USER,
        to,
        subject,
        html
    }
    console.log(process.env.EMAIL_PASS, process.env.EMAIL_USER)
    return transporter.sendMail(mailOptions)
}