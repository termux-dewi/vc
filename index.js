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
            .glass { background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
            video { width: 100%; border-radius: 1.5rem; background: #000; object-fit: cover; aspect-ratio: 16/9; }
            .self-view { transform: scaleX(-1); border: 3px solid #3b82f6; }
            #video-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; padding: 15px; }
        </style>
    </head>
    <body class="bg-slate-950 text-slate-100 min-h-screen">

        <div id="auth-ui" class="flex items-center justify-center h-screen p-4">
            <div class="glass p-8 rounded-[2rem] w-full max-w-sm text-center shadow-2xl">
                <i data-lucide="video" class="w-12 h-12 text-blue-500 mx-auto mb-4"></i>
                <h1 class="text-2xl font-bold mb-6">V-Call Pro</h1>
                <div class="space-y-3">
                    <input id="user" type="text" placeholder="Username" class="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500">
                    <input id="pass" type="password" placeholder="Password" class="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500">
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
                <span class="font-bold flex items-center gap-2"><div class="w-2 h-2 bg-green-500 rounded-full animate-ping"></div> Room: <span id="room-display" class="text-blue-400"></span></span>
                <button onclick="location.reload()" class="bg-red-500/20 text-red-400 px-4 py-2 rounded-full font-bold hover:bg-red-600 hover:text-white transition">Keluar</button>
            </header>

            <div id="video-grid" class="flex-1 overflow-y-auto"></div>

            <footer class="p-6 flex flex-wrap justify-center items-center gap-4 glass m-2 rounded-[2.5rem]">
                <button onclick="toggleAudio()" id="btn-audio" class="p-4 bg-slate-800 rounded-full hover:bg-slate-700 transition"><i data-lucide="mic"></i></button>
                <button onclick="toggleVideo()" id="btn-video" class="p-4 bg-slate-800 rounded-full hover:bg-slate-700 transition"><i data-lucide="video"></i></button>
                <button onclick="flipCamera()" class="p-4 bg-slate-800 rounded-full hover:bg-slate-700 transition"><i data-lucide="refresh-cw"></i></button>
                <button onclick="toggleScreenShare()" id="btn-screen" class="p-4 bg-blue-600 rounded-full hover:bg-blue-500 transition shadow-lg shadow-blue-500/30"><i data-lucide="monitor-up"></i></button>
            </footer>
        </div>

        <script>
            lucide.createIcons();
            const BACKEND = "https://api.darkdocker.qzz.io"; 
            let myID, myRoom, socket, localStream, screenStream;
            let peers = {};
            let isSharing = false;
            let currentFacing = "user";

            async function startApp(type) {
                myID = document.getElementById('user').value;
                myRoom = document.getElementById('room').value;
                const pass = document.getElementById('pass').value;
                if(!myID || !myRoom) return alert("Lengkapi data!");

                const res = await fetch(\`\${BACKEND}/\${type}\`, {
                    method: 'POST',
                    body: JSON.stringify({username: myID, password: pass})
                });
                if(res.ok) { initCall(); } else { alert("Login/Gagal!"); }
            }

            async function initCall() {
                document.getElementById('auth-ui').classList.add('hidden');
                document.getElementById('main-ui').classList.remove('hidden');
                document.getElementById('room-display').innerText = myRoom;

                localStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: currentFacing },
                    audio: true
                });

                renderVideo(myID, localStream, true);

                const wsURL = BACKEND.replace('http','ws') + "/ws?id=" + myID + "&room=" + myRoom;
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

                // Trigger panggil user lain yang sudah di dalam room
                setTimeout(() => sendSig("all", "join", null), 1500);
            }

            function setupPeer(targetID, isInitiator) {
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
                });
                peers[targetID] = pc;

                localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

                pc.onicecandidate = (e) => e.candidate && sendSig(targetID, 'candidate', e.candidate);
                
                pc.ontrack = (e) => {
                    if(document.getElementById('cont-'+targetID)) return;
                    renderVideo(targetID, e.streams[0], false);
                };

                // Negosiasi Mesh
                if(isInitiator || true) {
                    pc.createOffer().then(o => { pc.setLocalDescription(o); sendSig(targetID, 'offer', o); });
                }
            }

            function renderVideo(id, stream, isSelf) {
                const grid = document.getElementById('video-grid');
                const div = document.createElement('div');
                div.id = 'cont-' + id;
                div.className = 'relative';
                div.innerHTML = \`<video id="vid-\${id}" autoplay playsinline \${isSelf ? 'muted' : ''} class="\${isSelf && currentFacing === 'user' ? 'self-view' : ''} shadow-2xl"></video>
                                 <div class="absolute bottom-4 left-4 glass px-3 py-1 rounded-full text-xs font-bold">\${id}</div>\`;
                grid.appendChild(div);
                document.getElementById('vid-'+id).srcObject = stream;
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
                const myVid = document.getElementById('vid-'+myID);
                myVid.srcObject = newStream;
                currentFacing === "user" ? myVid.classList.add('self-view') : myVid.classList.remove('self-view');
            }

            async function toggleScreenShare() {
                if(!isSharing) {
                    try {
                        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                        const screenTrack = screenStream.getVideoTracks()[0];
                        for(let id in peers) {
                            const sender = peers[id].getSenders().find(s => s.track.kind === 'video');
                            if(sender) sender.replaceTrack(screenTrack);
                        }
                        document.getElementById('vid-'+myID).srcObject = screenStream;
                        isSharing = true;
                        screenTrack.onended = () => toggleScreenShare();
                    } catch (e) { console.error("Screen share gagal."); }
                } else {
                    const videoTrack = localStream.getVideoTracks()[0];
                    for(let id in peers) {
                        const sender = peers[id].getSenders().find(s => s.track.kind === 'video');
                        if(sender) sender.replaceTrack(videoTrack);
                    }
                    document.getElementById('vid-'+myID).srcObject = localStream;
                    if(screenStream) screenStream.getTracks().forEach(t => t.stop());
                    isSharing = false;
                }
            }

            function sendSig(target, type, data) {
                socket.send(JSON.stringify({ room_id: myRoom, sender_id: myID, target_id: target, type, data }));
            }

            function toggleAudio() { 
                const track = localStream.getAudioTracks()[0];
                track.enabled = !track.enabled;
                document.getElementById('btn-audio').classList.toggle('bg-red-500');
            }
            function toggleVideo() { 
                const track = localStream.getVideoTracks()[0];
                track.enabled = !track.enabled;
                document.getElementById('btn-video').classList.toggle('bg-red-500');
            }
        </script>
    </body>
    </html>
    `;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
}
