export default {
  async fetch(request) {
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>V-Call Pro Ultra</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <style>
            .glass { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
            video { width: 100%; border-radius: 1.5rem; background: #000; object-fit: cover; aspect-ratio: 16/9; }
            .self-view { transform: scaleX(-1); border: 2px solid #3b82f6; }
            #video-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
            .msg { padding: 10px 14px; border-radius: 18px; margin-bottom: 8px; max-width: 85%; font-size: 13px; line-height: 1.4; }
            .msg-me { background: #2563eb; align-self: flex-end; border-bottom-right-radius: 4px; }
            .msg-them { background: #334155; align-self: flex-start; border-bottom-left-radius: 4px; }
            .voice-mode video { display: none; }
            .voice-mode .avatar-call { display: flex; width: 100%; aspect-ratio: 16/9; background: linear-gradient(to bottom, #1e293b, #0f172a); border-radius: 1.5rem; align-items: center; justify-content: center; }
            .avatar-call { display: none; }
            .pulse { animation: pulse 2s infinite; }
            @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); } 100% { transform: scale(0.95); } }
        </style>
    </head>
    <body class="bg-[#020617] text-slate-100 min-h-screen font-sans flex flex-col overflow-hidden">

        <div id="auth-ui" class="flex items-center justify-center h-screen p-4">
            <div class="glass p-8 rounded-[2.5rem] w-full max-w-sm text-center shadow-2xl">
                <div class="flex justify-center gap-3 mb-6 text-blue-500"><i data-lucide="shield-check" class="w-10 h-10"></i></div>
                <h1 class="text-2xl font-bold mb-6 italic tracking-tighter">V-CALL PRO</h1>
                <div class="space-y-3 mb-6 text-left">
                    <label class="text-[10px] uppercase ml-2 text-slate-500 font-bold">Identity</label>
                    <input id="user" type="text" placeholder="Username" class="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500">
                    <input id="pass" type="password" placeholder="Password" class="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500">
                    <input id="room" type="text" placeholder="Room ID" class="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500">
                </div>
                <div class="flex flex-col gap-2">
                    <button onclick="handleAuth('login', 'video')" class="bg-blue-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
                        <i data-lucide="video" class="w-5 h-5"></i> Video Call
                    </button>
                    <button onclick="handleAuth('login', 'voice')" class="bg-slate-800 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 border border-slate-700">
                        <i data-lucide="phone" class="w-5 h-5 text-green-500"></i> Voice Only
                    </button>
                </div>
            </div>
        </div>

        <div id="main-ui" class="hidden flex flex-col h-screen">
            <header class="p-4 flex justify-between items-center glass m-2 rounded-2xl">
                <div>
                    <div class="text-[10px] text-slate-500 font-bold uppercase">Streaming Room</div>
                    <div id="room-id" class="font-black text-blue-400"></div>
                </div>
                <div class="flex gap-2">
                    <button onclick="toggleChat()" class="p-3 bg-slate-800 rounded-xl relative">
                        <i data-lucide="message-square" class="w-5 h-5"></i>
                        <span id="notif-chat" class="hidden absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#020617]"></span>
                    </button>
                    <button onclick="logout()" class="p-3 bg-red-500/10 text-red-500 rounded-xl"><i data-lucide="power" class="w-5 h-5"></i></button>
                </div>
            </header>

            <div class="flex flex-1 overflow-hidden p-2 gap-2">
                <div id="video-grid" class="flex-1 overflow-y-auto content-start pb-20"></div>
                
                <div id="chat-panel" class="hidden w-80 glass rounded-[2rem] flex flex-col overflow-hidden shadow-2xl border border-white/5">
                    <div class="p-4 border-b border-white/5 flex items-center justify-between">
                        <span class="font-bold text-sm">Messages</span>
                        <button onclick="toggleChat()" class="text-slate-500"><i data-lucide="x" class="w-4 h-4"></i></button>
                    </div>
                    <div id="chat-msgs" class="flex-1 overflow-y-auto p-4 flex flex-col"></div>
                    
                    <div id="file-preview" class="hidden p-3 bg-blue-600/20 text-[10px] flex justify-between items-center border-t border-blue-500/30">
                        <span id="file-name" class="truncate font-bold"></span>
                        <button onclick="cancelFile()" class="text-red-400 font-bold">BATAL</button>
                    </div>

                    <div class="p-4 bg-slate-900/80 flex items-center gap-2">
                        <button onclick="document.getElementById('file-input').click()" class="text-slate-400"><i data-lucide="paperclip" class="w-5 h-5"></i></button>
                        <input type="file" id="file-input" class="hidden" onchange="handleFileSelect(this)">
                        <input id="chat-input" type="text" placeholder="Ketik pesan..." class="flex-1 bg-transparent py-1 outline-none text-sm">
                        <button id="vn-btn" 
                            onmousedown="startVN()" onmouseup="stopVN()" 
                            ontouchstart="startVN()" ontouchend="stopVN()"
                            class="p-2 bg-slate-800 rounded-full text-slate-400 transition-colors">
                            <i data-lucide="mic" class="w-4 h-4"></i>
                        </button>
                        <button onclick="sendChat()" class="p-2.5 bg-blue-600 rounded-xl shadow-lg"><i data-lucide="send" class="w-4 h-4"></i></button>
                    </div>
                </div>
            </div>

            <footer class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 glass px-6 py-4 rounded-[3rem] shadow-2xl border border-white/10">
                <button onclick="toggleAudio()" id="btn-mic" class="p-4 bg-slate-800 rounded-full transition-all"><i data-lucide="mic"></i></button>
                <button onclick="toggleVideo()" id="btn-vid" class="p-4 bg-slate-800 rounded-full transition-all"><i data-lucide="video"></i></button>
                <button onclick="flipCamera()" id="btn-flip" class="p-4 bg-slate-800 rounded-full"><i data-lucide="refresh-cw"></i></button>
                <button onclick="shareScreen()" id="btn-screen" class="p-4 bg-blue-600 rounded-full"><i data-lucide="monitor-up"></i></button>
            </footer>
        </div>

        <script>
            lucide.createIcons();
            const BACKEND = "https://api.darkdocker.qzz.io"; 
            let myID, myRoom, socket, localStream, callMode = 'video', mediaRecorder, audioChunks = [], selectedFile = null;
            let peers = {};

            // AUTO-LOGIN
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
                if(!myID || !myRoom) return;

                try {
                    const res = await fetch(\`\${BACKEND}/\${type}\`, { method: 'POST', body: JSON.stringify({username: myID, password: pass}) });
                    if(res.ok) {
                        localStorage.setItem('v_u', myID); localStorage.setItem('v_p', pass); localStorage.setItem('v_r', myRoom);
                        initCall();
                    } else alert("Akses Ditolak!");
                } catch(e) { alert("Server Termux Offline!"); }
            }

            async function initCall() {
                document.getElementById('auth-ui').classList.add('hidden');
                document.getElementById('main-ui').classList.remove('hidden');
                document.getElementById('room-id').innerText = myRoom;

                const constraints = { audio: true, video: callMode === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false };
                localStream = await navigator.mediaDevices.getUserMedia(constraints);
                
                if(callMode === 'voice') {
                    document.getElementById('btn-vid').style.display = 'none';
                    document.getElementById('btn-flip').style.display = 'none';
                    document.getElementById('btn-screen').style.display = 'none';
                }

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

            function setupPeer(id, init) {
                const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
                peers[id] = pc;
                localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
                pc.onicecandidate = (e) => e.candidate && sendSig(id, 'candidate', e.candidate);
                pc.ontrack = (e) => renderVideo(id, e.streams[0], false);
                if(init || true) pc.createOffer().then(o => { pc.setLocalDescription(o); sendSig(id, 'offer', o); });
            }

            function renderVideo(id, stream, isSelf) {
                if(document.getElementById('cont-'+id)) return;
                const hasVideo = stream.getVideoTracks().length > 0;
                const div = document.createElement('div');
                div.id = 'cont-' + id;
                div.className = \`relative \${!hasVideo ? 'voice-mode' : ''}\`;
                div.innerHTML = \`
                    <video id="vid-\${id}" autoplay playsinline \${isSelf ? 'muted' : ''} class="\${isSelf ? 'self-view' : ''} shadow-2xl"></video>
                    <div class="avatar-call"><div class="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center pulse shadow-2xl shadow-blue-500/50"><i data-lucide="user" class="w-12 h-12"></i></div></div>
                    <div class="absolute bottom-4 left-4 glass px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 border border-white/10 uppercase tracking-tighter">
                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> \${id} \${isSelf ? '(You)' : ''}
                    </div>\`;
                document.getElementById('video-grid').appendChild(div);
                document.getElementById('vid-'+id).srcObject = stream;
                lucide.createIcons();
            }

            // FILE & CHAT HANDLING
            function handleFileSelect(input) {
                selectedFile = input.files[0];
                if(selectedFile) {
                    document.getElementById('file-preview').classList.remove('hidden');
                    document.getElementById('file-name').innerText = selectedFile.name;
                }
            }
            function cancelFile() { selectedFile = null; document.getElementById('file-preview').classList.add('hidden'); }

            async function sendChat() {
                const input = document.getElementById('chat-input');
                if(!input.value && !selectedFile) return;
                let fData = null;
                if(selectedFile) {
                    const reader = new FileReader();
                    fData = await new Promise(r => { reader.onload=()=>r({name:selectedFile.name, type:selectedFile.type, data:reader.result}); reader.readAsDataURL(selectedFile); });
                }
                const payload = { text: input.value, file: fData };
                sendSig("all", "chat", payload);
                appendMsg(myID, payload, 'me');
                input.value = ''; cancelFile();
            }

            // VOICE NOTE (VN)
            async function startVN() {
                const stream = await navigator.mediaDevices.getUserMedia({audio:true});
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(audioChunks, {type:'audio/ogg; codecs=opus'});
                    const reader = new FileReader();
                    reader.onload = () => {
                        const p = { text: "", file: { name: "Voice Note", type: "audio/vn", data: reader.result } };
                        sendSig("all", "chat", p); appendMsg(myID, p, 'me');
                    };
                    reader.readAsDataURL(blob);
                };
                mediaRecorder.start();
                document.getElementById('vn-btn').classList.add('bg-red-600', 'text-white', 'pulse');
            }
            function stopVN() { 
                if(mediaRecorder) { mediaRecorder.stop(); document.getElementById('vn-btn').classList.remove('bg-red-600', 'text-white', 'pulse'); }
            }

            function appendMsg(sender, payload, type) {
                const box = document.getElementById('chat-msgs');
                const div = document.createElement('div');
                div.className = \`msg \${type === 'me' ? 'msg-me' : 'msg-them'}\`;
                let content = \`<div class="text-[9px] font-black opacity-40 mb-1">\${sender.toUpperCase()}</div>\`;
                if(payload.text) content += \`<div>\${payload.text}</div>\`;
                if(payload.file) {
                    const f = payload.file;
                    if(f.type.startsWith('image/')) content += \`<img src="\${f.data}" class="rounded-xl mt-2 max-h-48 w-full object-cover shadow-lg">\`;
                    else if(f.type.startsWith('video/')) content += \`<video src="\${f.data}" controls class="rounded-xl mt-2 shadow-lg"></video>\`;
                    else if(f.type === "audio/vn") content += \`<audio src="\${f.data}" controls class="mt-2 w-full h-8 opacity-80"></audio>\`;
                    else content += \`<a href="\${f.data}" download="\${f.name}" class="flex items-center gap-2 p-3 bg-black/20 rounded-xl mt-2 border border-white/5"><i data-lucide="file-text"></i> <span class="truncate text-[10px]">\${f.name}</span></a>\`;
                }
                div.innerHTML = content; box.appendChild(div); box.scrollTop = box.scrollHeight; lucide.createIcons();
                if(type === 'them' && document.getElementById('chat-panel').classList.contains('hidden')) document.getElementById('notif-chat').classList.remove('hidden');
            }

            function toggleChat() { document.getElementById('chat-panel').classList.toggle('hidden'); document.getElementById('notif-chat').classList.add('hidden'); }
            function sendSig(t, type, data) { if(socket.readyState===1) socket.send(JSON.stringify({room_id:myRoom, sender_id:myID, target_id:t, type, data})); }
            function logout() { localStorage.clear(); location.reload(); }
            function toggleAudio() { localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled; document.getElementById('btn-mic').classList.toggle('bg-red-600'); }
            function toggleVideo() { if(callMode==='voice') return; localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled; document.getElementById('btn-vid').classList.toggle('bg-red-600'); }
            async function flipCamera() { /* Logika flip kamera */ }
            async function shareScreen() { /* Logika share screen */ }
        </script>
    </body>
    </html>
    `;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
}
