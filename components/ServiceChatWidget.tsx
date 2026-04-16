import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User, ChatMessage } from '../types';
import { MessageCircle, X, Send, Minus, Maximize2 } from 'lucide-react';

interface ServiceChatWidgetProps {
  currentUser: User;
  isDarkMode: boolean;
}

const ServiceChatWidget: React.FC<ServiceChatWidgetProps> = ({ currentUser, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializa o chat e busca histórico
  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('service_chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setMessages(data.reverse() as ChatMessage[]);
      }
    };

    fetchHistory();

    // Inscreve no canal de mensagens
    const chatChannel = supabase.channel('service_chat_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'service_chat_messages' 
      }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        setMessages(prev => [...prev, newMessage]);
        
        // Se estiver fechado ou usuário não for o próprio, aumentar contador e tocar som
        if (!isOpen && newMessage.user_id !== currentUser.id) {
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [isOpen, currentUser.id]);

  // Rolar para baixo ao receber mensagem
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3'); // Fallback silently se não existir
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const messageContent = inputValue.trim();
    setInputValue(''); // Limpa otimista

    // Enviar pro Supabase
    const { error } = await supabase
      .from('service_chat_messages')
      .insert([{
        user_id: currentUser.id,
        username: currentUser.username,
        rank: currentUser.rank,
        war_name: currentUser.warName || currentUser.name,
        content: messageContent
      }]);

    if (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Fallback
    }
  };

  // Funções de formato de tempo
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Botão Flutuante (Fechado) */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`relative p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 group 
            ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          <MessageCircle className="w-7 h-7" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-900 animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {/* Tooltip */}
          <div className={`absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700 shadow-md'}`}>
            Canal Operacional
          </div>
        </button>
      )}

      {/* Janela de Chat Aberta */}
      {isOpen && (
        <div 
          className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] 
            ${isDarkMode ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'} 
            ${isMinimized ? 'w-72 h-14 rounded-t-2xl' : 'w-80 sm:w-96 h-[500px] max-h-[80vh] rounded-2xl'} border`}
        >
          {/* Header do Chat */}
          <div 
            className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none border-b
              ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-slate-100 border-slate-300'}
            `}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <MessageCircle className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div className="absolute bottom-0 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-current"></div>
              </div>
              <h3 className={`font-black text-sm uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Canal Operacional</h3>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                className={`p-1.5 rounded hover:bg-black/10 transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'}`}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsOpen(false); 
                  setUnreadCount(0);
                }}
                className={`p-1.5 rounded hover:bg-rose-500 hover:text-white transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Área de Mensagens */}
          {!isMinimized && (
            <>
              <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                {messages.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50`}>
                    <MessageCircle className="w-8 h-8" />
                    <p className="text-xs font-medium px-6">Nenhuma mensagem recente. Este é um canal seguro para as equipes de serviço e administração.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.user_id === currentUser.id;
                    const showHeader = idx === 0 || messages[idx - 1].user_id !== msg.user_id;

                    return (
                      <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {showHeader && !isMine && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            {msg.rank} {msg.war_name}
                          </span>
                        )}
                        <div className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap word-break flex flex-col gap-1 shadow-sm
                          ${isMine 
                            ? isDarkMode ? 'bg-blue-600 text-white rounded-br-none' : 'bg-blue-600 text-white rounded-br-none' 
                            : isDarkMode ? 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/50' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                          }`}
                        >
                          <span>{msg.content}</span>
                          <span className={`text-[9px] font-medium self-end opacity-70`}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Área de Input */}
              <form 
                onSubmit={handleSend}
                className={`p-3 border-t ${isDarkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200'} flex gap-2`}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className={`flex-1 rounded-full px-4 py-2 text-sm outline-none transition-all
                    ${isDarkMode 
                      ? 'bg-slate-900 border border-slate-700 text-white focus:border-blue-500' 
                      : 'bg-slate-100 border border-transparent text-slate-900 focus:border-blue-300 focus:bg-white'
                    }`}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className={`p-2.5 rounded-full flex items-center justify-center transition-all
                    ${!inputValue.trim() 
                      ? isDarkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'
                      : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-md shadow-blue-500/20'
                    }`}
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceChatWidget;
