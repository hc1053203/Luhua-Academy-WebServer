import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./style.css";


function System() {
  const [username,setusername]=useState('')
  const [password,setpassword]=useState('')
  return(
    <div>
      <h1>會員登入</h1>
      <div className="container login">
        <p>帳號:</p>
        <input type="text" className="login"
        value={username}
        onChange={(e)=>{setusername(e.target.value)}}
        />
      </div>
      <div className="container login">
        <p>密碼:</p>
        <input type="password" className="login"
        value={password}
        onChange={(e)=>{setpassword(e.target.value)}}
        />
      </div>
    </div>
  )
}

function Login(){
  
}

export default System;
