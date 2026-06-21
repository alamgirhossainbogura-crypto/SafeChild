import React, { useState, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function App() {
  // States
  const [lat, setLat] = useState<number>(23.6850); // Default BD Lat
  const [lng, setLng] = useState<number>(90.3563); // Default BD Lng
  const [isListening, setIsListening] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'হ্যালো! আমি SafeChild ফার্স্ট এইড AI। যেকোনো জরুরি পরিস্থিতিতে প্রাথমিক চিকিৎসার জন্য আমাকে জিজ্ঞাসা করো।' }
  ]);
  const [contacts, setContacts] = useState({
    primary: localStorage.getItem('primary_contact') || '',
    secondary: localStorage.getItem('secondary_contact') || ''
  });
  const [currentTriggerCount, setCurrentTriggerCount] = useState<number>(0);

  // 1. Geolocation Logic (Leaflet Interfacing Matrix)
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
        },
        (error) => console.error("Geolocator Error:", error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // 2. Web Speech API for Voice Trigger ("Help Help")
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const resultIndex = event.resultIndex;
      const speechText = event.results[resultIndex][0].transcript.trim().toLowerCase();
      
      if (speechText.includes('help help')) {
        executeAlternatingSOS();
      }
    };

    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => recognition.stop();
  }, [isListening, currentTriggerCount]);

  // 3. Alternating Emergency Calling Logic
  const executeAlternatingSOS = () => {
    setCurrentTriggerCount((prev) => prev + 1);
    
    if (currentTriggerCount % 2 === 0 && contacts.primary) {
      window.location.href = `tel:${contacts.primary}`;
    } else if (contacts.secondary) {
      window.location.href = `tel:${contacts.secondary}`;
    } else {
      // Fallback to National Hub
      window.location.href = 'tel:999';
    }
  };

  // 4. Secure Backend Edge-Routed Chat Handler
  const handleBotQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: Message = { role: 'user', text: chatInput };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    try {
      // Fetch via MeDo Serverless Edge Platform to securely mask API Keys
      const res = await fetch('https://app-cdk7t9oatj41.appmedo.com/api/gemini-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': 'SecureEdgeToken_SafeChild_2026'
        },
        body: JSON.stringify({ prompt: chatInput })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'দুঃখিত, নেটওয়ার্ক কানেকশন চেক করো। জরুরি প্রয়োজনে ডাক্তার বা ৯৯৯ এ কল করো।' }]);
    }
  };

  const saveContacts = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('primary_contact', contacts.primary);
    localStorage.setItem('secondary_contact', contacts.secondary);
    alert('Emergency Contacts Saved Locally! 🛡️');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ color: '#00D2D3', fontSize: '24px', fontWeight: 'bold' }}>🛡️ SafeChild</h1>
          <p style={{ color: '#94A3B8', fontSize: '12px' }}>AI Safety Ecosystem for BD</p>
        </div>
      </header>

      {/* Geospatial Map Container Proxy */}
      <div className="neon-border-cyan" style={{ height: '200px', backgroundColor: '#1E293B', borderRadius: '12px', position: 'relative', marginBottom: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '12px', height: '12px', backgroundColor: '#00D2D3', borderRadius: '50%', boxShadow: '0 0 10px #00D2D3', marginBottom: '8px' }}></div>
        <p style={{ color: '#00D2D3', fontSize: '13px', fontWeight: '600' }}>Live Map Tracking Center</p>
        <p style={{ color: '#94A3B8', fontSize: '11px' }}>Lat: {lat.toFixed(5)} | Lng: {lng.toFixed(5)}</p>
      </div>

      {/* Big SOS Button */}
      <button onClick={executeAlternatingSOS} className="neon-btn-red" style={{ width: '100%', padding: '24px', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}>
        🚨 EMERGENCY HELP
      </button>

      {/* Voice Trigger Setup */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <button onClick={() => setIsListening(!isListening)} style={{ padding: '10px 20px', borderRadius: '25px', border: 'none', backgroundColor: isListening ? '#00D2D3' : '#334155', color: isListening ? '#0F172A' : '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{isListening ? '🎙️ Listening for "Help Help"...' : '🎤 Enable Voice SOS'}</span>
        </button>
      </div>

      {/* Config Panel */}
      <form onSubmit={saveContacts} style={{ backgroundColor: '#1E293B', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#00D2D3' }}>⚙️ Setup Guardian Contacts (localStorage)</h3>
        <input type="tel" placeholder="Primary Guardian Number" value={contacts.primary} onChange={e => setContacts({...contacts, primary: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #334155', background: '#0F172A', color: '#fff' }} />
        <input type="tel" placeholder="Secondary Guardian Number" value={contacts.secondary} onChange={e => setContacts({...contacts, secondary: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0F172A', color: '#fff' }} />
        <button type="submit" style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Save Configurations</button>
      </form>

      {/* Gemini Chatbot Interconnection UI */}
      <div style={{ backgroundColor: '#1E293B', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '14px', color: '#00D2D3', marginBottom: '10px' }}>🤖 Medical Context Engine (Gemini 2.5 Flash)</h3>
        <div style={{ height: '140px', overflowY: 'auto', backgroundColor: '#0F172A', padding: '10px', borderRadius: '8px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: m.role === 'user' ? '#1E293B' : '#334155', padding: '8px 12px', borderRadius: '8px', maxWidth: '85%', fontSize: '13px' }}>
              {m.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleBotQuery} style={{ display: 'flex', gap: '8px' }}>
          <input type="text" placeholder="সিম্পটম লিখুন (যেমন: কাটা হাত বা পোড়া)..." value={chatInput} onChange={e => setChatInput(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0F172A', color: '#fff', fontSize: '13px' }} />
          <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#00D2D3', border: 'none', borderRadius: '6px', color: '#0F172A', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
        </form>
        
        {/* Guardrail Disclaimer */}
        <div style={{ marginTop: '12px', border: '1px solid #EAB308', padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
          <p style={{ color: '#EAB308', fontSize: '11px', lineHeight: '1.4' }}>⚠️ <strong>Disclaimer:</strong> This AI ecosystem handles immediate operational first-aid. It cannot replace clinical diagnostics by human doctors.</p>
        </div>
      </div>

      {/* Backup Direct National Link */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <a href="tel:999" style={{ color: '#FF4757', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>📞 Route to National Emergency Hub (999)</a>
      </div>
    </div>
  );
}
