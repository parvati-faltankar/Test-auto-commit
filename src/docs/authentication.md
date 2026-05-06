# 📘 Authentication Module (Login & Registration)

## 📌 Overview

This document describes a simple authentication system with:

* **Login Page**
* **Registration Page**
* **Two login methods**
* **LocalStorage-based data handling (no backend yet)**

---

## 🚀 Features

### 🔐 Login Options

1. **Username & Password Login**
2. **Mobile Number & OTP Login**

### 📝 Registration

* User can register using:

  * Username
  * Password
  * Mobile Number

### ✅ After Login

* Redirect to a simple page displaying:

  > "Login Successfully"

### 💾 Data Storage

* All user data stored in **localStorage**
* No backend/API integration

---

## 📂 Suggested Folder Structure

```
src/
 ├── pages/
 │    ├── Login.tsx
 │    ├── Register.tsx
 │    └── Success.tsx
 ├── utils/
 │    └── auth.ts
 ├── App.tsx
 └── main.tsx
```

---

## 🧾 Data Structure (localStorage)

### Users Storage Key: `users`

```json
[
  {
    "username": "testuser",
    "password": "123456",
    "mobile": "9876543210"
  }
]
```

---

## 🔧 Utility Functions (`auth.ts`)

```ts
export const getUsers = () => {
  return JSON.parse(localStorage.getItem("users") || "[]");
};

export const saveUsers = (users: any[]) => {
  localStorage.setItem("users", JSON.stringify(users));
};

export const registerUser = (user: any) => {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
};

export const loginWithUsername = (username: string, password: string) => {
  const users = getUsers();
  return users.find(
    (u: any) => u.username === username && u.password === password
  );
};

export const loginWithMobile = (mobile: string) => {
  const users = getUsers();
  return users.find((u: any) => u.mobile === mobile);
};
```

---

## 📝 Registration Page Logic

* Input fields:

  * Username
  * Password
  * Mobile Number
* On submit:

  * Save user in `localStorage`
  * Redirect to Login page

---

## 🔐 Login Page Logic

### Option 1: Username & Password

* Validate against stored users
* If valid → navigate to success page

---

### Option 2: Mobile + OTP

#### Step 1: Enter Mobile Number

* Check if mobile exists

#### Step 2: Generate OTP

```ts
const otp = Math.floor(1000 + Math.random() * 9000);
localStorage.setItem("otp", otp.toString());
alert(`OTP: ${otp}`);
```

#### Step 3: Verify OTP

```ts
const storedOtp = localStorage.getItem("otp");
if (enteredOtp === storedOtp) {
  // success
}
```

---

## ✅ Success Page

Display message:

```tsx
<h1>Login Successfully</h1>
```

---

## 🔄 Navigation Flow

```
Register Page → Login Page → Success Page
```

---

## ⚠️ Important Notes

* This is **only for learning/demo purposes**
* localStorage is **not secure**
* OTP is simulated (not real SMS)

---

## 🔮 Future Improvements

* Backend integration (Node.js / Go)
* JWT authentication
* Real OTP service (Firebase, Twilio)
* Password hashing
* Form validation (Formik / React Hook Form)
* State management (Redux Toolkit)

---

## 🧠 Summary

| Feature          | Status         |
| ---------------- | -------------- |
| Registration     | ✅ LocalStorage |
| Login (Username) | ✅ Implemented  |
| Login (OTP)      | ✅ Simulated    |
| Redirect         | ✅ Done         |
| Backend          | ❌ Not added    |

---

If you want next step, I can:

* Convert this into **full React + Vite + TypeScript code**
* Add **Redux Toolkit authentication flow**
* Or connect it with a **real Go backend API**
