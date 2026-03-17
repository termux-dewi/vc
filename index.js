export default {
  async fetch(request) {
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>V-Call Pro Final</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <style>
            .glass { background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
            video { width: 100%; border-radius: 1rem; background: #000; object-fit: cover; aspect-ratio: 16/9; }
            .self-view { transform: scaleX(-1); border: 2px solid #3b82f6; }
            #video-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; padding: 10px; }
        </style>
    </head>
    <body class="bg-[#020617] text-slate-100 min-h-screen font-sans">

        <div id="auth-ui" class="flex items-center justify-center h-screen p-4">
            <div class="glass p-8 rounded-[2rem] w-full max-w-sm shadow-2xl text-center">
                <i data-lucide="video" class="w-10 h-10 text-blue-500 mx-auto mb-4"></i>
                <h1 class="text-xl font-bold mb-6">V-Call Pro</h1>
                <div class="space-y-3">
                    <input id="user" type="text" placeholder="User" class="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500">
                    <input id="pass" type="password" placeholder="Pass" class="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500">
                    <input id="room" type="text" placeholder="Room ID" class="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500">
                </div>
                <div class="grid grid-cols-2 gap-3 mt-6">
                    <button onclick="startApp('login')" class="bg-blue-600 p-4 rounded-xl font-bold">Login</button>
                    <button onclick="startApp('register')" class="bg-slate-800 p-4 rounded-xl font-bold">Daftar</button>
                </div>
            </div>
        </div>

        <div id="main-ui" class="hidden flex flex-col h-screen">
            <header class="p-4 flex justify-between items-center glass m-2 rounded-2xl">
                <span class="text-sm font-bold flex items-center gap-2"><div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Room: <span id="room-id" class="text-blue-400"></span></span>
                <button onclick="location.reload()" class="bg-red-500/20 text-red-400 px-4 py-1 rounded-full text-xs font-bold">Keluar</button>
            </header>
            <div id="video-grid" class="flex-1 overflow-y-auto"></div>
            <footer class="p-6 flex justify-center items-center gap-4 glass m-2 rounded-[2.5rem]">
                <button onclick="toggleAudio()" class="p-4 bg-slate-800 rounded-full"><i data-lucide="mic"></i></button>
                <button onclick="toggleVideo()" class="p-4 bg-slate-800 rounded-full"><i data-lucide="video"></i></button>
                <button onclick="flipCamera()" class="p-4 bg-slate-800 rounded-full"><i data-lucide="refresh-cw"></i></button>
                <button onclick="shareScreen()" class="p-4 bg-blue-600 rounded-full"><i data-lucide="monitor-up"></i></button>
            </footer>
        </div>

        <script>
            lucide.createIcons();
            const BACKEND = "https://api.darkdocker.qzz.io"; 
            let myID, myRoom, socket, localStream, screenStream;
            let peers = {};
            let currentFacing = "user";

            async function startApp(type) {
                myID = document.getElementById('user').value;
                myRoom = document.getElementById('room').value;
                const pass = document.getElementById('pass').value;
                if(!myID || !myRoom) return alert("Isi semua!");

                const res = await fetch(\`\${BACKEND}/\${type}\`, {
                    method: 'POST',
                    body: JSON.stringify({username: myID, password: pass})
                });
                if(res.ok) { initCall(); } else { alert("Error!"); }
            }

            async function initCall() {
                document.getElementById('auth-ui').classList.add('hidden');
                document.getElementById('main-ui').classList.remove('hidden');
                document.getElementById('room-id').innerText = myRoom;

                localStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: currentFacing },
                    audio: true
                });

                renderVideo(myID, localStream, true);

                const wsURL = BACKEND.replace('https','wss') + "/ws?id=" + myID + "&room=" + myRoom;
                socket = new WebSocket(wsURL);

                socket.onmessage = async (e) => {
                    const msg = JSON.parse(e.data);
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

            function setupPeer(targetID, isInitiator) {
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                });
                peers[targetID] = pc;
                localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

                pc.onicecandidate = (e) => e.candidate && sendSig(targetID, 'candidate', e.candidate);
                pc.ontrack = (e) => {
                    if(!document.getElementById('cont-'+targetID)) renderVideo(targetID, e.streams[0], false);
                };

                if(isInitiator || true) {
                    pc.createOffer().then(o => { pc.setLocalDescription(o); sendSig(targetID, 'offer', o); });
                }
            }

            function renderVideo(id, stream, isSelf) {
                const grid = document.getElementById('video-grid');
                if(document.getElementById('cont-'+id)) return;
                const div = document.createElement('div');
                div.id = 'cont-' + id;
                div.className = 'relative';
                div.innerHTML = \`<video id="vid-\${id}" autoplay playsinline \${isSelf ? 'muted' : ''} class="\${isSelf && currentFacing === 'user' ? 'self-view' : ''}"></video>
                                 <div class="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-lg text-[10px]">\${id}</div>\`;
                grid.appendChild(div);
                const vid = document.getElementById('vid-'+id);
                vid.srcObject = stream;
                vid.onloadedmetadata = () => vid.play().catch(() => {});
            }

            async function flipCamera() {
                currentFacing = currentFacing === "user" ? "environment" : "user";
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: currentFacing },
                    audio: true
                });
                const videoTrack = newStream.getVideoTracks()[0];
                for(let id in peers) {
                    const sender = peers[id].getSenders().find(s => s.track.kind === 'video');
                    if(sender) sender.replaceTrack(videoTrack);
                }
                localStream.getTracks().forEach(t => t.stop());
                localStream = newStream;
                document.getElementById('vid-'+myID).srcObject = newStream;
                const v = document.getElementById('vid-'+myID);
                currentFacing === "user" ? v.classList.add('self-view') : v.classList.remove('self-view');
            }

            async function shareScreen() {
                try {
                    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    const track = screenStream.getVideoTracks()[0];
                    for(let id in peers) {
                        const sender = peers[id].getSenders().find(s => s.track.kind === 'video');
                        if(sender) sender.replaceTrack(track);
                    }
                    document.getElementById('vid-'+myID).srcObject = screenStream;
                    track.onended = () => {
                        const vTrack = localStream.getVideoTracks()[0];
                        for(let id in peers) {
                            const sender = peers[id].getSenders().find(s => s.track.kind === 'video');
                            if(sender) sender.replaceTrack(vTrack);
                        }
                        document.getElementById('vid-'+myID).srcObject = localStream;
                    };
                } catch (e) {}
            }

            function sendSig(target, type, data) {
                if (socket.readyState === 1) socket.send(JSON.stringify({ room_id: myRoom, sender_id: myID, target_id: target, type, data }));
            }

            function toggleAudio() { localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled; }
            function toggleVideo() { localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled; }
        </script>
    </body>
    </html>
    `;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
      }
