import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./style.css";

function System() {
  return (
    <div>
      <h1>會員登入</h1>
      <div className="container login">
        <p>帳號:</p>
        <input type="text" className="login"></input>
      </div>
      <div className="container login">
        <p>密碼:</p>
        <input type="password" className="login"></input>
      </div>
    </div>
  );
}

export default System;
