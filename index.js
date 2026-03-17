export default {
  async fetch(request) {
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Messenger Pro</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <style>
            body { background-color: #000; color: white; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            .glass { background: rgba(25, 25, 25, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
            
            /* Messenger Grid: Menyesuaikan jumlah peserta */
            #video-grid { 
                display: grid; 
                gap: 10px; 
                padding: 10px;
                height: 100%;
                width: 100%;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                align-content: center;
                transition: all 0.3s ease;
            }

            /* Khusus 1 User: Full Screen */
            #video-grid:has(> :last-child:nth-child(1)) { grid-template-columns: 1fr; }
            /* Khusus 2 User: Split Screen */
            #video-grid:has(> :last-child:nth-child(2)) { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
            @media (min-width: 768px) {
                #video-grid:has(> :last-child:nth-child(2)) { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
            }

            .video-card { 
                position: relative; 
                border-radius: 24px; 
                overflow: hidden; 
                background: #1a1a1a;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                height: 100%;
                width: 100%;
            }

            video { width: 100%; height: 100%; object-fit: cover; border-radius: 24px; }
            .self-view { transform: scaleX(-1); border: 2px solid #0084ff; }

            /* Nama di pojok video */
            .user-tag {
                position: absolute;
                bottom: 15px;
                left: 15px;
                background: rgba(0,0,0,0.5);
                padding: 4px 14px;
                border-radius: 50px;
                font-size: 12px;
                font-weight: 500;
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                gap: 6px;
            }

            /* Chat Slide-over (Messenger Style) */
            #chat-panel {
                position: fixed;
                right: 0;
                top: 0;
                bottom: 0;
                width: 100%;
                max-width: 400px;
                z-index: 50;
                transform: translateX(100%);
                transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            #chat-panel.open { transform: translateX(0); }

            .msg-bubble { 
                padding: 10px 16px; 
                border-radius: 20px; 
                margin-bottom: 4px; 
                max-width: 75%; 
                font-size: 14px; 
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .msg-me { background: #0084ff; align-self: flex-end; border-bottom-right-radius: 4px; }
            .msg-them { background: #303030; align-self: flex-start; border-bottom-left-radius: 4px; }

            /* Navigasi Bawah Messenger */
            .bottom-nav {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 15px;
                z-index: 40;
                background: rgba(30, 30, 30, 0.8);
                padding: 12px 25px;
                border-radius: 100px;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.1);
            }

            .nav-icon { 
                width: 52px; height: 52px; 
                border-radius: 50%; 
                display: flex; items-center; justify-center;
                background: #3a3b3c;
                transition: transform 0.2s, background 0.2s;
            }
            .nav-icon:active { transform: scale(0.9); }
            .nav-icon.danger { background: #ff3b30; }
            .nav-icon.active { background: #0084ff; }
        </style>
    </head>
    <body class="flex flex-col h-screen">

        <div id="auth-ui" class="flex items-center justify-center h-screen p-6 bg-black z-[100]">
            <div class="w-full max-w-sm text-center">
                <div class="mb-10 flex justify-center">
                    <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[35px] rotate-12 shadow-2xl flex items-center justify-center">
                        <i data-lucide="video" class="w-12 h-12 text-white -rotate-12"></i>
                    </div>
                </div>
                <h1 class="text-3xl font-black mb-10 tracking-tight">Messenger</h1>
                <div class="space-y-3 mb-8">
                    <input id="user" type="text" placeholder="Username" class="w-full p-4 rounded-2xl bg-[#1c1c1e] border border-white/5 outline-none focus:ring-2 focus:ring-blue-500">
                    <input id="pass" type="password" placeholder="Password" class="w-full p-4 rounded-2xl bg-[#1c1c1e] border border-white/5 outline-none focus:ring-2 focus:ring-blue-500">
                    <input id="room" type="text" placeholder="Room ID" class="w-full p-4 rounded-2xl bg-[#1c1c1e] border border-white/5 outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <button onclick="handleAuth('login', 'video')" class="w-full bg-[#0084ff] p-4 rounded-2xl font-bold text-lg mb-3">Mulai Video Call</button>
                <button onclick="handleAuth('login', 'voice')" class="w-full bg-[#3a3b3c] p-4 rounded-2xl font-bold">Panggilan Suara</button>
            </div>
        </div>

        <div id="main-ui" class="hidden flex-1 relative flex flex-col">
            <header class="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-30">
                <div class="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                    <span id="room-id" class="text-sm font-bold text-blue-400 tracking-wider"></span>
                </div>
                <div class="flex gap-3">
                    <button onclick="toggleChat()" class="w-12 h-12 glass rounded-full flex items-center justify-center relative active:scale-90 transition-transform">
                        <i data-lucide="message-circle" class="w-6 h-6"></i>
                        <span id="notif-chat" class="hidden absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-black"></span>
                    </button>
                    <button onclick="logout()" class="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                        <i data-lucide="log-out" class="w-6 h-6"></i>
                    </button>
                </div>
            </header>

            <div id="video-grid" class="flex-1"></div>

            <div id="chat-panel" class="glass border-l border-white/10">
                <div class="flex flex-col h-full">
                    <div class="p-5 border-b border-white/5 flex items-center justify-between">
                        <h2 class="font-bold">Obrolan Room</h2>
                        <button onclick="toggleChat()" class="p-2 hover:bg-white/5 rounded-full"><i data-lucide="chevron-right"></i></button>
                    </div>
                    <div id="chat-msgs" class="flex-1 overflow-y-auto p-5 flex flex-col gap-1"></div>
                    <div id="file-preview" class="hidden p-3 bg-blue-600/10 flex justify-between px-6 border-t border-blue-500/20">
                        <span id="file-name" class="text-xs truncate font-medium"></span>
                        <button onclick="cancelFile()" class="text-red-500 text-xs font-bold">BATAL</button>
                    </div>
                    <div class="p-5 bg-[#121212] flex items-center gap-3">
                        <button onclick="document.getElementById('file-input').click()"><i data-lucide="plus" class="w-6 h-6 text-[#0084ff]"></i></button>
                        <input type="file" id="file-input" class="hidden" onchange="handleFileSelect(this)">
                        <input id="chat-input" type="text" placeholder="Tulis pesan..." class="flex-1 bg-[#242526] py-3 px-5 rounded-full text-sm outline-none focus:ring-1 focus:ring-blue-500">
                        <button id="vn-btn" onmousedown="startVN()" onmouseup="stopVN()" class="p-1"><i data-lucide="mic" class="w-6 h-6 text-[#0084ff]"></i></button>
                        <button onclick="sendChat()" class="p-1"><i data-lucide="send-horizontal" class="w-6 h-6 text-[#0084ff]"></i></button>
                    </div>
                </div>
            </div>

            <div class="bottom-nav">
                <button onclick="toggleAudio()" id="btn-mic" class="nav-icon"><i data-lucide="mic"></i></button>
                <button onclick="toggleVideo()" id="btn-vid" class="nav-icon"><i data-lucide="video"></i></button>
                <button onclick="flipCamera()" class="nav-icon"><i data-lucide="refresh-cw"></i></button>
                <button onclick="shareScreen()" class="nav-icon active"><i data-lucide="monitor-up"></i></button>
            </div>
        </div>

        <script>
            lucide.createIcons();
            const BACKEND = "https://api.darkdocker.qzz.io"; 
            let myID, myRoom, socket, localStream, callMode = 'video', mediaRecorder, audioChunks = [], selectedFile = null;
            let peers = {};

            // Logika Auto-Login
            window.onload = () => {
                const u = localStorage.getItem('v_u'), p = localStorage.getItem('v_p'), r = localStorage.getItem('v_r');
                if(u && p && r) { 
                    document.getElementById('user').value = u; document.getElementById('pass').value = p; document.getElementById('room').value = r; 
                    handleAuth('login', 'video');
                }
            }

            async function handleAuth(type, mode) {
                callMode = mode;
                myID = document.getElementById('user').value;
                myRoom = document.getElementById('room').value;
                const pass = document.getElementById('pass').value;
                if(!myID || !myRoom) return alert("Lengkapi data!");

                const res = await fetch(\`\${BACKEND}/\${type}\`, { method: 'POST', body: JSON.stringify({username: myID, password: pass}) });
                if(res.ok) {
                    localStorage.setItem('v_u', myID); localStorage.setItem('v_p', pass); localStorage.setItem('v_r', myRoom);
                    initCall();
                } else alert("Login Gagal!");
            }

            async function initCall() {
                document.getElementById('auth-ui').classList.add('hidden');
                document.getElementById('main-ui').classList.remove('hidden');
                document.getElementById('room-id').innerText = myRoom.toUpperCase();

                const constraints = { audio: true, video: callMode === 'video' ? { facingMode: 'user' } : false };
                localStream = await navigator.mediaDevices.getUserMedia(constraints);
                
                renderVideo(myID, localStream, true);
                socket = new WebSocket(BACKEND.replace('https','wss') + "/ws?id=" + myID + "&room=" + myRoom);
                
                socket.onmessage = async (e) => {
                    const msg = JSON.parse(e.data);
                    if(msg.type === 'chat') return appendMsg(msg.sender_id, msg.data, 'them');
                    if(!peers[msg.sender_id]) setupPeer(msg.sender_id, false);
                    const pc = peers[msg.sender_id];
                    if(msg.type === 'offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                        const ans = await pc.createAnswer();
                        await pc.setLocalDescription(ans);
                        sendSig(msg.sender_id, 'answer', ans);
                    } else if(msg.type === 'answer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                    } else if(msg.type === 'candidate') {
                        await pc.addIceCandidate(new RTCIceCandidate(msg.data));
                    }
                };
                setTimeout(() => sendSig("all", "init", null), 2000);
            }

            function renderVideo(id, stream, isSelf) {
                if(document.getElementById('cont-'+id)) return;
                const div = document.createElement('div');
                div.id = 'cont-' + id;
                div.className = 'video-card';
                div.innerHTML = \`
                    <video id="vid-\${id}" autoplay playsinline \${isSelf ? 'muted' : ''} class="\${isSelf ? 'self-view' : ''}"></video>
                    <div class="user-tag">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>\${id} \${isSelf ? '(Anda)' : ''}</span>
                    </div>\`;
                document.getElementById('video-grid').appendChild(div);
                document.getElementById('vid-'+id).srcObject = stream;
            }

            function toggleChat() {
                document.getElementById('chat-panel').classList.toggle('open');
                document.getElementById('notif-chat').classList.add('hidden');
            }

            // ... (Fungsi setupPeer, sendSig, sendChat, VN tetap sama dengan versi sebelumnya) ...
            function sendSig(t, type, data) { if(socket.readyState===1) socket.send(JSON.stringify({room_id:myRoom, sender_id:myID, target_id:t, type, data})); }
            function logout() { localStorage.clear(); location.reload(); }
        </script>
    </body>
    </html>
    `;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
}
