'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Heart, Loader2 } from 'lucide-react'
import type { Message } from '@/app/page'

interface ConversationPanelProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  isProcessing?: boolean
}

export function ConversationPanel({ messages, onSendMessage, isProcessing = false }: ConversationPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (input.trim() && !isProcessing) {
      onSendMessage(input)
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickActions = [
    { label: 'Symptoms Check', prompt: 'I want to describe my symptoms' },
    { label: 'Medication Info', prompt: 'I need information about a medication' },
    { label: 'Wellness Tips', prompt: 'Can you give me some wellness tips?' },
    { label: 'Emergency Help', prompt: 'I need emergency guidance' }
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <h1 className="text-2xl font-semibold text-foreground text-balance">
          Medical Assistant Ami
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your compassionate AI healthcare companion
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-medical-primary/10 mb-4">
                <Heart className="h-8 w-8 text-medical-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Welcome to Ami
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                I'm here to provide medical information and support. 
                How can I help you today?
              </p>

              <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => onSendMessage(action.prompt)}
                    className="border-medical-primary/30 hover:bg-medical-primary/10 hover:border-medical-primary/50"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card
                    className={`p-4 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-medical-primary text-white'
                        : 'bg-card border-medical-primary/20'
                    }`}
                  >
                    {message.role === 'user' && message.emotion && message.emotion !== 'neutral' && (
                      <div className="mb-2">
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full capitalize">
                          {message.emotion}
                        </span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <span className={`text-xs mt-2 block ${
                      message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </Card>
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <Card className="p-4 bg-card border-medical-primary/20">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-medical-primary" />
                      <span className="text-sm text-muted-foreground">Ami is thinking...</span>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-6 border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message or use voice input..."
              className="min-h-[60px] resize-none bg-background border-medical-primary/20 focus:border-medical-primary"
              rows={2}
              disabled={isProcessing}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="bg-medical-primary hover:bg-medical-primary/90 h-[60px] px-6"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift + Enter for new line
          </p>

          <div className="mt-3 p-2 bg-medical-accent/5 border border-medical-accent/20 rounded-md">
            <p className="text-xs text-muted-foreground text-center">
              Ami provides information, not diagnosis. For emergencies, call your local emergency services.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
