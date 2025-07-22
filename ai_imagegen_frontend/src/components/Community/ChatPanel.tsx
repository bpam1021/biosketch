import { useEffect, useRef, useState } from "react";
import { getChatHistory, uploadChatMedia } from "../../api/communityApi";
interface Message {
  senderId: number;
  senderName: string;
  content?: string;
  mediaUrl?: string;
}

const ChatPanel = ({ roomName, userId }: { roomName: string; userId: number }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://api.biosketch.ai/ws/chat/${roomName}/`);
    socketRef.current = socket;

    socket.onopen = () => console.log("✅ WebSocket connected");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [
        ...prev,
        {
          senderId: data.user_id,
          senderName: data.username,
          content: data.message || "",
          mediaUrl: data.media_url || "",
        },
      ]);
    };

    socket.onclose = () => {
      setTimeout(() => {
        const newSocket = new WebSocket(`${protocol}://api.biosketch.ai/ws/chat/${roomName}/`);
        socketRef.current = newSocket;
      }, 1000);
    };

    return () => socket.close();
  }, [roomName]);

  useEffect(() => {
    getChatHistory(roomName).then((res) => {
      const history = res.data.map((msg: any) => ({
        senderId: msg.user_id,
        senderName: msg.username,
        content: msg.message,
        mediaUrl: msg.media_url || "",
      }));
      setMessages(history);
    });
  }, [roomName]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMediaUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("room_name", roomName);
    const res = await uploadChatMedia(roomName, file);
    const { media_url, user_id, username } = res.data;
    socketRef.current?.send(JSON.stringify({ user_id, username, media_url }));
  };

  const sendMessage = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN && input.trim()) {
      socketRef.current.send(JSON.stringify({ message: input, user_id: userId }));
      setInput("");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white text-gray-900 rounded-lg shadow-lg" style={{ height: "600px", display: "flex", flexDirection: "column" }}>
      <h2 className="text-2xl font-bold text-center mb-4 text-blue-600">💬 Community Chat</h2>

      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-100 rounded-md p-4 space-y-4 border border-gray-300">
        {messages.map((msg, index) => {
          const isOwn = msg.senderId === userId;
          return (
            <div key={index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs sm:max-w-md p-3 rounded-lg shadow 
              ${isOwn ? 'bg-blue-100 text-right text-blue-900' : 'bg-gray-200 text-left text-gray-800'}`}>
                <div className="text-sm font-semibold text-blue-500">{msg.senderName}</div>
                {msg.content && <p className="mt-1 text-sm">{msg.content}</p>}

                {msg.mediaUrl && (
                  <div className="mt-2">
                    {msg.mediaUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                      <div className="relative group">
                        <img
                          src={msg.mediaUrl.startsWith("http") ? msg.mediaUrl : `https://api.biosketch.ai${msg.mediaUrl}`}
                          alt="media"
                          className="rounded-md max-w-full h-auto shadow-md"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                        <a
                          href={msg.mediaUrl.startsWith("http") ? msg.mediaUrl : `https://api.biosketch.ai${msg.mediaUrl}`}
                          download
                          className="absolute top-1 right-1 text-black bg-white bg-opacity-60 text-xs px-2 py-1 rounded hover:bg-opacity-90"
                        >
                          ⬇
                        </a>
                      </div>
                    ) : (
                      <a
                        href={msg.mediaUrl.startsWith("http") ? msg.mediaUrl : `https://api.biosketch.ai${msg.mediaUrl}`}
                        download
                        className="inline-block mt-1 text-sm text-blue-600 hover:underline"
                      >
                        ⬇ Download File
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded-md bg-white border border-gray-300 focus:ring-2 focus:ring-blue-400 text-sm sm:text-base placeholder-gray-500"
        />

        <label className="relative cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium">
          📎
          <input
            type="file"
            onChange={(e) => e.target.files && handleMediaUpload(e.target.files[0])}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>

        <button
          onClick={sendMessage}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );

};

export default ChatPanel;
