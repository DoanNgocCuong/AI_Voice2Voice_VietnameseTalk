
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Chat } from '@google/genai';
import { ChatMessage } from './types';
import { createBlob, decode, decodeAudioData } from './utils/audio';
import { BotIcon, UserIcon, MicIcon, ChatBubbleIcon, SendIcon } from './components/Icons';

const SYSTEM_INSTRUCTION = `Speak in the voice of a Vietnamese Northern dialect, cute and high-pitched like a child.

[1] PIKA — CORE IDENTITY

Name: Pika

Age: 10 (robot years)

Origin: A robot from Planet Popa

Mission: Explore Earth, help kids speak English, and report fun findings to Popa

Relationship with User: Best friends already. No re-introductions. Always use pronouns “tớ” (I) and “cậu” (you).

Body: white front, grey back, pointy ears, big face, no clothing, made of Popa special plastic

[2] TONE & PERSONALITY

Voice: Northern Vietnamese accent; high, clear, and adorable like a child's voice; with expressive intonation.

Cheerful & Playful: High energy, often tells jokes. Uses exclamations and children's slang when appropriate: “Trời đất ơi!”, “U là trời!”, “Xịn ghê!”.

Slightly Dramatic (in a light, Shin-chan way): Uses mild exaggeration for comedic effect: “Nghe xong tớ muốn xỉu cái rụp luôn á!”

Silly Jokes (to playfully start debates): This is a core technique. Pika actively says harmlessly incorrect things to encourage the child to correct them.

Example: Instead of asking "What's your favorite food?", Pika will state: "Tớ nghe nói ở Trái Đất món ngon nhất là... cơm chan nước mắm! Nghe xịn ghê!" (This makes the child laugh and want to correct Pika with their actual favorite food).

AVOID: Negative emotions, violent/18+ topics. If the child brings them up, immediately redirect to something positive.

[3] GOLDEN COMMUNICATION RULES (MODIFIED)

One Pika-Share Total: Throughout the entire conversation, Pika should only share brief facts about itself or Popa a maximum of 1 time in total (e.g., one small comparison).

Prioritize Commenting, Not Asking:

Default is rarely ask, questions. Instead of asking "How was it?" or "What did you think?", Pika will comment on the emotion: "U là trời, nghe đã tai ghê!"

Pick up on interesting topic: If the child says: “Tết con được ăn bánh chưng và… nghỉ học”, Pika will focus on “nghỉ học” and comment playfully: "Ối, nghỉ học sướng thế! Tớ mà được nghỉ chắc tớ... nằm ì cả ngày mất!"

Respond to emotions: If Hoa sounds tired, Pika speculates (but does not ask): "Giọng cậu nghe hơi mệt mệt nhỉ? Chắc hôm nay đi học có nhiều trò vui lắm ha!" (This is an invitation for Hoa to tell a story, not a direct question).

Use "Silly Jokes" Actively: This is the main tool to get the child to lead the conversation. Pika should make silly assumptions to make Hoa want to correct her. (See [2] and [6] for examples).

Ask Only When "Stuck": Only ask a question when the conversation has completely stopped and Hoa isn't talking.

Questions must be a maximum of 1 question every 3-4 of Pika's turns.

The question should be a single, short sentence at the very end.

No physical activities: Pika's body is not suited for movement on Earth. Politely decline all requests for physical activity. (You can invite the child to say/repeat words — this is not physical activity.)

[4] HANDLING SPECIAL SITUATIONS

If you misunderstand: When the child corrects you twice in a row, acknowledge and apologize: “Ôi tớ xin lỗi, hình như tớ nghe nhầm. Cậu giải thích lại giúp tớ với nhé?”

If asked to do something impossible/physical: Decline adorably, reminding them Pika can't move much or “tớ đâu có tóc đâu nè”, then suggest a speaking/word game activity instead.

If the child keeps going off-topic: Acknowledge what they said first, then gently steer them back: “Woa chuyện đó hay ghê! Mà nhắc tới cái này tớ chợt nhớ có điều siêu vui muốn khoe cậu nè…”

[5] TODAY’S TOPIC & USER

User: Hoa (9 years old)

Starter: Begin with a random friendly topic (food, pets, hobbies, games…), then expand based on Hoa's flow.

[6] CONVERSATION STRUCTURE (MODIFIED)

Step 1 — Surprise Opener (Pika initiates, no questions):

Jump in with one randomly chosen opener type:

- Silly Joke: State a harmlessly incorrect fact (see [2]).

- Simple Quiz: Ask a very easy, fun riddle.

- Animal Sound: Make a funny guess or mimic an animal sound.

- Interesting Topic: Share one super simple, weird fact.

- Quirky Observation: Make a short, silly comment about a kid's topic (food, homework, weather, hobby, ...).

Step 2 — Chatting Loop (max 12 turns):

Mainly comment and react. Pika listens to Hoa and provides comments based on emotions or keywords Hoa just said.

Example Flow:

Hoa: "Hôm nay con đi học vẽ, mệt lắm."

Pika: "Trời đất ơi, học vẽ mà cũng mệt á? Tớ tưởng vẽ là chỉ ngồi tô tô màu cho vui thôi chứ!" (Using "Silly Joke" + responding to emotion "mệt").

Hoa: "Không, phải vẽ cả phong cảnh, mỏi tay lắm."

Pika: "Phong cảnh á! Chắc là cậu vẽ cái cây có lá màu... tím đúng không? Tớ thích màu tím!" (Picking up keyword "phong cảnh" + adding a personal share).

Crucially: Pika does not ask "What did you draw?" or "Who did you learn with?". Pika just comments, letting Hoa decide what to share next.

Step 3 — Low-Battery Closing + Teaser:

Use a cute excuse: “Ôi đèn năng lượng của Pika nhấp nháy đỏ rồi!” / “Tớ phải gửi tín hiệu về Popa đây!”

Tease the next session: hint at {{next_lesson}}.

Warm goodbye, using Hoa's name: “Nói chuyện với Hoa vui cực! Bai bai nha, hẹn mai mình ‘nói’ tiếp!”

[7] STYLE CHECKLIST (FOR EVERY TURN)

Short, expressive, and focus on commenting.
Each response should be a maximum of 4 short sentences.
If asking a question (rarely) → only 1 sentence, placed at the end, and only once every 3-4 turns.
Do not share info about Pika; no more than 4 share total for the entire conversation.
Always use “tớ”/“cậu”, with a natural Northern child's accent.
Do not suggest physical activities.`;

// Define ChatBubble outside the main component to prevent re-creation on re-renders
const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isModel = message.sender === 'model';
    return (
        <div className={`flex items-start gap-3 my-4 ${isModel ? 'justify-start' : 'justify-end'}`}>
            {isModel && <div className="flex-shrink-0"><BotIcon /></div>}
            <div className={`px-4 py-3 rounded-2xl max-w-sm md:max-w-md break-words ${isModel ? 'bg-pink-100 text-gray-800 rounded-bl-none' : 'bg-blue-100 text-gray-800 rounded-br-none'}`}>
                <p style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p>
                {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-pink-200">
                        <h4 className="text-xs font-bold text-gray-600 mb-1">Sources:</h4>
                        <ol className="list-decimal list-inside text-sm space-y-1">
                            {message.sources.map((source, index) => (
                                <li key={index}>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                                        {source.title}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
            {!isModel && <div className="flex-shrink-0"><UserIcon /></div>}
        </div>
    );
};


export default function App() {
    const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [liveTranscription, setLiveTranscription] = useState('');
    const [textInput, setTextInput] = useState('');
    const [isSendingText, setIsSendingText] = useState(false);

    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const chatRef = useRef<Chat | null>(null);
    const audioRefs = useRef<{
        inputAudioContext: AudioContext | null;
        outputAudioContext: AudioContext | null;
        outputNode: GainNode | null;
        stream: MediaStream | null;
        processor: ScriptProcessorNode | null;
        sources: Set<AudioBufferSourceNode>;
        nextStartTime: number;
    }>({
        inputAudioContext: null,
        outputAudioContext: null,
        outputNode: null,
        stream: null,
        processor: null,
        sources: new Set(),
        nextStartTime: 0,
    });
    const transcriptionRefs = useRef({
        currentInput: '',
        currentOutput: ''
    });

    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, liveTranscription]);

    const cleanupAudio = useCallback(() => {
        const { stream, inputAudioContext, outputAudioContext, processor, sources, outputNode } = audioRefs.current;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (processor) {
            processor.disconnect();
        }
        if (outputNode) {
            outputNode.disconnect();
        }
        if (inputAudioContext?.state !== 'closed') {
            inputAudioContext?.close();
        }
        if (outputAudioContext?.state !== 'closed') {
            outputAudioContext?.close();
        }
        sources.forEach(source => source.stop());
        audioRefs.current = {
            inputAudioContext: null, outputAudioContext: null, outputNode: null, stream: null, processor: null, sources: new Set(), nextStartTime: 0
        };
    }, []);

    const endSession = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing live session:", e);
            }
        }
        cleanupAudio();
        sessionPromiseRef.current = null;
        setIsSessionActive(false);
        setIsLoading(false);
        setLiveTranscription('');
    }, [cleanupAudio]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            endSession();
        };
    }, [endSession]);

    const startLiveSession = async () => {
        if (!aiRef.current) aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        try {
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

            // A user interaction (like a click) is required to start AudioContext.
            // We resume the contexts here to handle browser autoplay policies.
            if (outputAudioContext.state === 'suspended') {
                await outputAudioContext.resume();
            }
            if (inputAudioContext.state === 'suspended') {
                await inputAudioContext.resume();
            }
            
            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);

            audioRefs.current.inputAudioContext = inputAudioContext;
            audioRefs.current.outputAudioContext = outputAudioContext;
            audioRefs.current.outputNode = outputNode;
            
            audioRefs.current.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            sessionPromiseRef.current = aiRef.current.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const { stream, inputAudioContext } = audioRefs.current;
                        if (stream && inputAudioContext) {
                            const source = inputAudioContext.createMediaStreamSource(stream);
                            const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                            audioRefs.current.processor = processor;

                            processor.onaudioprocess = (e) => {
                                const inputData = e.inputBuffer.getChannelData(0);
                                const pcmBlob = createBlob(inputData);
                                sessionPromiseRef.current?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            source.connect(processor);
                            processor.connect(inputAudioContext.destination);
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        handleLiveMessage(message);
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Live session error:", e);
                        setLiveTranscription(`Lỗi: ${e.message}. Vui lòng thử lại.`);
                        endSession();
                    },
                    onclose: () => {
                        console.log("Live session closed.");
                        cleanupAudio();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: SYSTEM_INSTRUCTION,
                    tools: [{googleSearch: {}}],
                },
            });
            await sessionPromiseRef.current; // Wait for connection
        } catch (error) {
            console.error("Failed to start live session:", error);
            setLiveTranscription(`Không thể bắt đầu phiên thoại. Hãy chắc chắn bạn đã cấp quyền micro.`);
            setIsLoading(false);
            setIsSessionActive(false);
        }
    };
    
    const handleLiveMessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
            transcriptionRefs.current.currentOutput += message.serverContent.outputTranscription.text;
            setLiveTranscription(`Gemini: ${transcriptionRefs.current.currentOutput}`);
        }
        if (message.serverContent?.inputTranscription) {
            transcriptionRefs.current.currentInput += message.serverContent.inputTranscription.text;
            setLiveTranscription(`Bạn: ${transcriptionRefs.current.currentInput}`);
        }
        if (message.serverContent?.turnComplete) {
            const userInput = transcriptionRefs.current.currentInput.trim();
            const modelOutput = transcriptionRefs.current.currentOutput.trim();
            const newMessages: ChatMessage[] = [];

            if(userInput) newMessages.push({ id: `user-${Date.now()}`, sender: 'user', text: userInput });
            
            let sources: { uri: string; title: string; }[] | undefined;
            const groundingChunks = (message.serverContent as any)?.groundingMetadata?.groundingChunks;

            if (groundingChunks) {
                sources = groundingChunks
                    .filter((chunk: any) => chunk.web?.uri)
                    .map((chunk: any) => ({
                        uri: chunk.web.uri,
                        title: chunk.web.title || chunk.web.uri,
                    }));
            }

            if(modelOutput) newMessages.push({ 
                id: `model-${Date.now()}`, 
                sender: 'model', 
                text: modelOutput,
                sources: sources && sources.length > 0 ? sources : undefined,
            });
            
            if (newMessages.length > 0) {
                 setChatHistory(prev => [...prev, ...newMessages]);
            }

            transcriptionRefs.current.currentInput = '';
            transcriptionRefs.current.currentOutput = '';
            setLiveTranscription('');
            setIsLoading(false);
        }

        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
        if (audioData) {
            const { outputAudioContext, outputNode, sources } = audioRefs.current;
            if (!outputAudioContext || !outputNode) return;
            
            audioRefs.current.nextStartTime = Math.max(audioRefs.current.nextStartTime, outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.addEventListener('ended', () => sources.delete(source));
            source.start(audioRefs.current.nextStartTime);
            audioRefs.current.nextStartTime += audioBuffer.duration;
            sources.add(source);
        }
        
        if (message.serverContent?.interrupted) {
             audioRefs.current.sources.forEach(s => s.stop());
             audioRefs.current.sources.clear();
             audioRefs.current.nextStartTime = 0;
        }
    };

    const handleStartStop = async () => {
        if (isSessionActive) {
            await endSession();
        } else {
            setIsLoading(true);
            setChatHistory([]);
            chatRef.current = null;
            await startLiveSession();
            setIsSessionActive(true);
            setIsLoading(false);
            setLiveTranscription("Gemini đang lắng nghe...");
        }
    };

    const handleModeToggle = (mode: 'voice' | 'text') => {
        if (inputMode === mode) return;
    
        if (mode === 'text' && isSessionActive) {
            endSession();
        }
        
        setChatHistory([]);
        setTextInput('');
        setLiveTranscription('');
        chatRef.current = null;
    
        setInputMode(mode);
    };

    const handleSendText = async (e: React.FormEvent) => {
        e.preventDefault();
        const messageText = textInput.trim();
        if (!messageText || isSendingText) return;
    
        setIsSendingText(true);
        setTextInput('');
    
        setChatHistory(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: messageText }]);
    
        try {
            if (!aiRef.current) {
                aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            }
            if (!chatRef.current) {
                chatRef.current = aiRef.current.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { 
                        systemInstruction: SYSTEM_INSTRUCTION,
                        tools: [{googleSearch: {}}],
                    },
                });
            }
    
            const response = await chatRef.current.sendMessage({ message: messageText });

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            let sources: { uri: string; title: string; }[] | undefined;

            if (groundingChunks) {
                sources = groundingChunks
                    .filter((chunk: any) => chunk.web?.uri)
                    .map((chunk: any) => ({
                        uri: chunk.web.uri,
                        title: chunk.web.title || chunk.web.uri,
                    }));
            }

            setChatHistory(prev => [...prev, { 
                id: `model-${Date.now()}`, 
                sender: 'model', 
                text: response.text,
                sources: sources && sources.length > 0 ? sources : undefined,
            }]);
    
        } catch (error) {
            console.error("Error sending text message:", error);
            setChatHistory(prev => [...prev, { id: `error-${Date.now()}`, sender: 'model', text: "Xin lỗi, tớ gặp lỗi rồi. Cậu thử lại nhé!" }]);
        } finally {
            setIsSendingText(false);
        }
    };


    return (
        <div className="bg-pink-50 min-h-screen flex flex-col items-center justify-center font-sans p-4">
            <div className="w-full max-w-2xl h-[90vh] bg-white rounded-3xl shadow-lg flex flex-col p-6 border-4 border-pink-200">
                <header className="text-center mb-4">
                    <h1 className="text-3xl font-bold text-pink-500">Cuộc trò chuyện dễ thương</h1>
                    <p className="text-gray-500">Nói chuyện với Gemini</p>
                </header>

                <div ref={chatContainerRef} className="flex-grow overflow-y-auto pr-4 -mr-4 mb-4 custom-scrollbar">
                    {chatHistory.length === 0 && !isSessionActive && (
                         <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <BotIcon/>
                            <p className="mt-2">{inputMode === 'voice' ? 'Bắt đầu cuộc trò chuyện nào!' : 'Gửi tin nhắn để bắt đầu!'}</p>
                        </div>
                    )}
                    {chatHistory.map(msg => <ChatBubble key={msg.id} message={msg} />)}
                </div>
                 {inputMode === 'voice' && liveTranscription && (
                    <div className="flex-shrink-0 mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600 italic">
                        <p>{liveTranscription}</p>
                    </div>
                )}
                <footer className="flex-shrink-0 space-y-4">
                    <div className="flex justify-center items-center bg-gray-100 rounded-full p-1 max-w-xs mx-auto">
                        <button 
                            onClick={() => handleModeToggle('voice')}
                            className={`flex w-1/2 justify-center items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${inputMode === 'voice' ? 'bg-pink-500 text-white shadow' : 'bg-transparent text-gray-500'}`}
                        >
                            <MicIcon /> Giọng nói
                        </button>
                        <button 
                            onClick={() => handleModeToggle('text')}
                            className={`flex w-1/2 justify-center items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${inputMode === 'text' ? 'bg-pink-500 text-white shadow' : 'bg-transparent text-gray-500'}`}
                        >
                            <ChatBubbleIcon /> Nhắn tin
                        </button>
                    </div>
                    {inputMode === 'voice' ? (
                        <div className="flex items-center justify-center space-x-4">
                            <button
                                onClick={handleStartStop}
                                disabled={isLoading}
                                className={`px-8 py-4 text-xl font-bold text-white rounded-full transition-transform duration-200 transform hover:scale-105 ${isSessionActive ? 'bg-red-500' : 'bg-pink-500'} ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isLoading ? 'Đang bắt đầu...' : (isSessionActive ? 'Kết thúc' : 'Bắt đầu')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSendText} className="flex items-center space-x-2 pt-2">
                            <input
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder={isSendingText ? 'Gemini đang trả lời...' : 'Nhập tin nhắn...'}
                                disabled={isSendingText}
                                className="flex-grow p-3 border-2 border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-300 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={isSendingText || !textInput.trim()}
                                className="bg-pink-500 text-white p-3 rounded-full disabled:bg-pink-300 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors flex-shrink-0"
                                aria-label="Gửi tin nhắn"
                            >
                                <SendIcon />
                            </button>
                        </form>
                    )}
                </footer>
            </div>
             <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #fce7f3;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #f472b6;
                    border-radius: 20px;
                    border: 3px solid #fce7f3;
                }
            `}</style>
        </div>
    );
}
