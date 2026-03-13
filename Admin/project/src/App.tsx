import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminDasboardCalendar from './pages/AdminDasboardCalendar';
function App() {
  return (
    <BrowserRouter>
        <Routes>
			<Route path="/" element={<AdminDasboardCalendar />} />
			<Route path="/AdminDasboardCalendar" element={<AdminDasboardCalendar />} />
        </Routes>
    </BrowserRouter>
  );
}
export default App;