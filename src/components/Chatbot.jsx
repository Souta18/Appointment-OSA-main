import { useState, useRef, useEffect } from 'react'
import './Chatbot.css'

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{
    id: 1,
    sender: 'bot',
    text: 'Hi there! How can I help you?'
  }])
  const [typing, setTyping] = useState(false)
  const nextId = useRef(2)
  const chatEnd = useRef(null)

  useEffect(() => {
    if (chatEnd.current) {
      chatEnd.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  const addMessage = (msg) => {
    setMessages(prev => [...prev, { ...msg, id: nextId.current++ }])
  }

  const [inputText, setInputText] = useState('')

  const sendText = (text) => {
    if (!text.trim()) return
    addMessage({ sender: 'user', text })
    setInputText('')
    // simulate bot reply generically
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      const reply = "Thanks for your message! We will get back to you shortly."
      addMessage({ sender: 'bot', text: reply })
    }, 800)
  }

  const handleChoice = (choice) => {
    sendText(choice)
  }

  return (
    <div className={`chatbot-container ${open ? 'open' : ''}`}>
      <button className={`chatbot-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)}>
        {open && <span className="close-icon">×</span>}
      </button>
      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <img src="/Logos/ComsAi.png" alt="ComSAi" />
            ComSAi
          </div>
          <div className="chatbot-body">
            {messages.map(m => (
              <div key={m.id} className={`message-row ${m.sender}`}>
                {m.sender === 'bot' && (
                  <img className="chat-avatar" src="/Logos/ComsAi.png" alt="bot" />
                )}
                <div className={`chat-message ${m.sender}`}>{m.text}</div>
                {m.sender === 'user' && (
                  <div className="chat-avatar user" />
                )}
              </div>
            ))}
            {typing && (
              <div className="message-row bot">
                <img className="chat-avatar" src="/Logos/ComsAi.png" alt="bot" />
                <div className="chat-message bot typing">...</div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>
          <div className="chatbot-footer">
            <button onClick={() => handleChoice('I want to inquire')}>I want to inquire</button>
            <button onClick={() => handleChoice('Report an issue')}>Report an issue</button>
          </div>
          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && inputText.trim()) {
                  sendText(inputText)
                }
              }}
            />
            {inputText.trim() && (
              <button className="send-button" onClick={() => sendText(inputText)}>
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}