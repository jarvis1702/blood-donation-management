import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { campService } from '../../services/campService';
import { donationHistoryService } from '../../services/donationHistoryService';

// Blood Compatibility Reference
const compatibilityMatrix = {
  'O-': { canDonateTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['O-'] },
  'O+': { canDonateTo: ['O+', 'A+', 'B+', 'AB+'], canReceiveFrom: ['O+', 'O-'] },
  'A-': { canDonateTo: ['A-', 'A+', 'AB-', 'AB+'], canReceiveFrom: ['A-', 'O-'] },
  'A+': { canDonateTo: ['A+', 'AB+'], canReceiveFrom: ['A+', 'A-', 'O+', 'O-'] },
  'B-': { canDonateTo: ['B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['B-', 'O-'] },
  'B+': { canDonateTo: ['B+', 'AB+'], canReceiveFrom: ['B+', 'B-', 'O+', 'O-'] },
  'AB-': { canDonateTo: ['AB-', 'AB+'], canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'] },
  'AB+': { canDonateTo: ['AB+'], canReceiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] }
};

const AIChatbotModal = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUser = authService.getCurrentUserProfile() || authService.getCurrentUser() || { name: 'Student', email: '' };

  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      sender: 'bot',
      text: `Hello ${currentUser.name ? currentUser.name.split(' ')[0] : 'there'}! 👋 I am **LifeFlow AI**, your KCT Blood Donation Assistant.\n\nI can verify your donation eligibility, check blood group compatibility, guide you through emergency requests, or find upcoming campus drives.`,
      chips: [
        'Am I eligible to donate?',
        'Check blood compatibility',
        'Upcoming campus drives',
        'Emergency request steps',
        'Donor health criteria'
      ]
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // AI response generator based on rules, knowledge base, and live context
  const generateAIResponse = (query) => {
    const q = query.toLowerCase().trim();

    // 1. Eligibility & 90-Day Cooldown Check
    if (q.includes('eligible') || q.includes('eligibility') || q.includes('can i donate') || q.includes('cooldown')) {
      const stats = donationHistoryService.getDonorStats(currentUser.email);
      const profile = authService.getUserProfile(currentUser.email) || currentUser;

      if (!profile.isDonor && !profile.bloodGroup) {
        return {
          text: `You haven't completed your donor registration yet!\n\nTo become an active donor:\n- Be aged **18–65**\n- Weigh at least **50 kg**\n- Have hemoglobin $\\ge 12.5$ g/dL\n\nWould you like to register as a donor now?`,
          action: { label: 'Register as Donor', path: '/profile' },
          chips: ['Donor health criteria', 'Upcoming campus drives', 'Check blood compatibility']
        };
      }

      if (stats.isEligible) {
        return {
          text: `✅ **Great news, ${currentUser.name ? currentUser.name.split(' ')[0] : 'Donor'}! You are currently ELIGIBLE to donate blood.**\n\n- **Blood Group:** ${profile.bloodGroup || 'Recorded in profile'}\n- **Availability:** ${profile.availability || 'Available'}\n- **Status:** Cleared mandatory 90-day cooldown interval.\n\nYou can book a slot at the upcoming campus drive or respond to emergency requests!`,
          action: { label: 'Book a Camp Slot', path: '/camps' },
          chips: ['Upcoming campus drives', 'Pre-donation checklist', 'Emergency request steps']
        };
      } else {
        return {
          text: `⏳ **You are currently in the 90-day Medical Cooldown Period.**\n\n- **Last Donated:** ${stats.lastDonationDate}\n- **Days Elapsed:** ${stats.daysSinceLastDonation} days\n- **Cooldown Remaining:** **${stats.daysRemaining} days**\n- **Next Eligible Date:** **${stats.nextEligibleDate}**\n\n*Why the wait?* The human body requires approximately 8–12 weeks to completely replenish iron reserves and red blood cell counts safely.`,
          action: { label: 'View Donation History', path: '/history' },
          chips: ['View Donation History', 'Donor health criteria', 'Upcoming campus drives']
        };
      }
    }

    // 2. Blood Compatibility Queries
    if (q.includes('compatibility') || q.includes('compatible') || q.includes('receive from') || q.includes('donate to') || q.includes('universal')) {
      // Check if specific blood group mentioned
      const groups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
      const matchedGroup = groups.find(g => q.toUpperCase().includes(g));

      if (matchedGroup && compatibilityMatrix[matchedGroup]) {
        const info = compatibilityMatrix[matchedGroup];
        return {
          text: `🧬 **Blood Compatibility for [${matchedGroup}]:**\n\n- **Can Donate Red Cells To:** ${info.canDonateTo.join(', ')}\n- **Can Receive Red Cells From:** ${info.canReceiveFrom.join(', ')}\n\n${matchedGroup === 'O-' ? '🌟 **O- is the Universal Donor:** Can be safely transfused to any patient in emergency trauma.' : ''}${matchedGroup === 'AB+' ? '🌟 **AB+ is the Universal Recipient:** Can receive red blood cells from any blood group.' : ''}`,
          chips: ['Check another group', 'Am I eligible to donate?', 'Upcoming campus drives']
        };
      }

      return {
        text: `🧬 **Blood Compatibility Quick Reference:**\n\n- **O- (Universal Red Cell Donor):** Can give to all groups; can receive ONLY from O-.\n- **O+:** Can give to O+, A+, B+, AB+; can receive from O+ and O-.\n- **A+:** Can give to A+, AB+; can receive from A+, A-, O+, O-.\n- **B+:** Can give to B+, AB+; can receive from B+, B-, O+, O-.\n- **AB+ (Universal Recipient):** Can give ONLY to AB+; can receive from all groups.\n\nType any blood group (e.g. *"Can B+ donate to A+"*) for specific details!`,
        chips: ['Compatibility for O+', 'Compatibility for AB+', 'Compatibility for O-']
      };
    }

    // 3. Upcoming Campus Camps
    if (q.includes('camp') || q.includes('drive') || q.includes('when') || q.includes('dates')) {
      const camps = campService.getCamps();
      const scheduled = camps.filter(c => c.status === 'Scheduled' || c.status === 'Upcoming');

      if (scheduled.length > 0) {
        const listText = scheduled.map(c => `• **${c.title}**\n  📅 ${c.date} (${c.time})\n  📍 ${c.venue}\n  🏥 Partner: ${c.partnerHospital}`).join('\n\n');
        return {
          text: `🎪 **Upcoming Campus Blood Drives at KCT:**\n\n${listText}\n\nYou can reserve your preferred donor time slot or register as a student volunteer!`,
          action: { label: 'Explore & Book Camps', path: '/camps' },
          chips: ['Book a Camp Slot', 'Am I eligible to donate?', 'Donor health criteria']
        };
      } else {
        return {
          text: `There are currently no scheduled campus drives. Check back soon or register your interest with the Youth Red Cross (YRC) Club!`,
          chips: ['Emergency request steps', 'Am I eligible to donate?']
        };
      }
    }

    // 4. Emergency Blood Request Steps
    if (q.includes('emergency') || q.includes('request') || q.includes('urgent') || q.includes('need blood') || q.includes('help')) {
      return {
        text: `🚑 **Emergency Blood Request Protocol:**\n\n1. **Post Request:** Go to *Blood Requests* and click **"Create Blood Request"**.\n2. **Specify Urgency:** Mark **"Immediate (<4 Hours)"** for trauma or urgent surgeries.\n3. **Smart Matching:** LifeFlow instantly matches available, eligible KCT campus donors with compatible blood groups.\n4. **Emergency Helplines:**\n   - **KCT Health Centre:** +91 422 2661100\n   - **CMCH Blood Bank:** 0422-2301393\n   - **108 Ambulance Service:** Toll-free 108`,
        action: { label: 'Create Blood Request', path: '/requests' },
        chips: ['Create Blood Request', 'Check blood compatibility', 'Upcoming campus drives']
      };
    }

    // 5. Donor Health Criteria & Guidelines
    if (q.includes('criteria') || q.includes('requirement') || q.includes('rules') || q.includes('weight') || q.includes('age') || q.includes('tattoo')) {
      return {
        text: `📋 **Clinical Donor Health Guidelines (KCT & YRC Standards):**\n\n- **Age:** 18 to 65 years\n- **Weight:** Minimum 50 kg\n- **Hemoglobin Level:** Minimum 12.5 g/dL\n- **Interval:** Minimum 90 days (3 months) since last whole blood donation\n- **Blood Pressure:** Systolic 100–140 mmHg, Diastolic 60–90 mmHg\n\n⚠️ **Temporary Deferrals:**\n- Tattoo / Piercing: Wait **6 months**\n- Alcohol consumption: Avoid within **24 hours** prior\n- Recent flu / fever / antibiotics: Wait **14 days** after full recovery\n- Major surgery: Wait **6 to 12 months**`,
        chips: ['Am I eligible to donate?', 'Pre-donation checklist', 'Upcoming campus drives']
      };
    }

    // 6. Pre / Post Donation Advice
    if (q.includes('pre') || q.includes('post') || q.includes('before') || q.includes('after') || q.includes('checklist') || q.includes('eat') || q.includes('food')) {
      return {
        text: `🍎 **Donor Care Advice (Before & After):**\n\n**Before Donating:**\n- Drink at least 500 ml of water or fluids before donating.\n- Have a nutritious light meal 2–3 hours prior (never donate on an empty stomach).\n- Get a sound 7–8 hours of sleep the night before.\n\n**After Donating:**\n- Rest in the recovery bay for 10–15 minutes and enjoy the provided juice & biscuits.\n- Avoid heavy exercise or weightlifting for 24 hours.\n- Drink plenty of water throughout the rest of the day.`,
        chips: ['Am I eligible to donate?', 'Upcoming campus drives', 'Donor health criteria']
      };
    }

    // Default Fallback with helpful recommendations
    return {
      text: `I'm here to support your blood donation journey at KCT! You can ask me:\n\n- *"Am I eligible to donate right now?"*\n- *"Can O+ give blood to A+?"*\n- *"What are the upcoming campus drive dates?"*\n- *"How do I raise an emergency blood request?"*\n- *"What is the 90-day cooldown period?"*`,
      chips: [
        'Am I eligible to donate?',
        'Upcoming campus drives',
        'Check blood compatibility',
        'Donor health criteria'
      ]
    };
  };

  const handleSendMessage = (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate natural AI thinking delay
    setTimeout(() => {
      const response = generateAIResponse(query);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.text,
        action: response.action,
        chips: response.chips
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleChipClick = (chipText) => {
    handleSendMessage(chipText);
  };

  const handleActionClick = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="ai-chatbot-trigger-container">
        <button
          className="ai-chatbot-trigger-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open LifeFlow AI Assistant"
          title="LifeFlow AI Blood Assistant"
        >
          <span className="ai-trigger-icon">🤖</span>
          <span className="ai-trigger-label">LifeFlow AI</span>
          <span className="ai-trigger-badge">KCT</span>
        </button>
      </div>

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div className="ai-chatbot-window">
          {/* Header */}
          <div className="ai-chatbot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="ai-avatar">🤖</div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: '#fff' }}>
                  LifeFlow AI Assistant
                </strong>
                <small style={{ color: '#ffcdd2', fontSize: '0.75rem' }}>
                  Online • KCT Blood & Health Guide
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button 
                className="ai-header-btn" 
                onClick={() => setMessages([
                  {
                    id: 'msg-welcome-reset',
                    sender: 'bot',
                    text: `Conversation cleared. How can I help you today?`,
                    chips: ['Am I eligible to donate?', 'Upcoming campus drives', 'Check blood compatibility']
                  }
                ])}
                title="Reset Chat"
              >
                🔄
              </button>
              <button 
                className="ai-header-btn" 
                onClick={() => setIsOpen(false)}
                title="Close Chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}>
                {msg.sender === 'bot' && (
                  <div className="ai-bot-bubble-avatar">🤖</div>
                )}

                <div className={`ai-message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '0.88rem', lineHeight: 1.45 }}>
                    {msg.text}
                  </div>

                  {msg.action && (
                    <div style={{ marginTop: '0.65rem' }}>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleActionClick(msg.action.path)}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      >
                        ➔ {msg.action.label}
                      </button>
                    </div>
                  )}

                  {msg.chips && msg.chips.length > 0 && (
                    <div className="ai-suggestion-chips" style={{ marginTop: '0.6rem' }}>
                      {msg.chips.map((chip, idx) => (
                        <button 
                          key={idx} 
                          className="ai-chip-btn"
                          onClick={() => handleChipClick(chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-message-row bot-row">
                <div className="ai-bot-bubble-avatar">🤖</div>
                <div className="ai-message-bubble bot-bubble" style={{ padding: '0.6rem 0.9rem' }}>
                  <div className="ai-typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form 
            className="ai-chatbot-footer" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input 
              type="text"
              className="ai-chat-input"
              placeholder="Ask about eligibility, camps, blood types..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isTyping}
            />
            <button 
              type="submit" 
              className="ai-chat-send-btn"
              disabled={!inputText.trim() || isTyping}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatbotModal;
