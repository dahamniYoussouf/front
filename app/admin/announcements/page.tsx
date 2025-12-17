'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Edit,
  Trash2,
  Eye,
  Plus,
  Calendar,
  AlertCircle,
  Code,
  Palette,
  FileText,
  X,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  LayoutTemplate,
  ChevronDown
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==== TYPES ====

type AnnouncementType = 'info' | 'success' | 'warning' | 'error';

interface Announcement {
  id: string;
  title: string;
  content: string;
  css_styles?: string;
  js_scripts?: string;
  type: AnnouncementType;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  restaurant?: {
    id: string;
    name: string;
  } | null;
  restaurant_id?: string | null;
}

type ModalType = '' | 'view' | 'edit' | 'create' | 'delete' | 'preview';

type BuilderTab = 'content' | 'css' | 'javascript';

// Templates d'annonces
const ANNOUNCEMENT_TEMPLATES = [
  {
    id: 'promo',
    name: 'Promotion',
    type: 'success' as AnnouncementType,
    content: `<div class="promo-announcement">
  <div class="promo-circle promo-circle-1"></div>
  <div class="promo-circle promo-circle-2"></div>
  <div class="promo-content">
    <div class="promo-emoji">🎉</div>
    <h2 class="promo-title">PROMOTION -30%</h2>
    <p class="promo-subtitle">Sur toutes vos commandes</p>
    <p class="promo-date">Valable jusqu'au 31 décembre 2024</p>
    <div class="promo-code-box">
      <div class="promo-code-label">CODE PROMO</div>
      <strong class="promo-code">PROMO2024</strong>
    </div>
  </div>
</div>`,
    css_styles: `.promo-announcement {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  border-radius: 16px;
  color: white;
  text-align: center;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
  animation: promoFadeIn 0.5s ease-in;
}

@keyframes promoFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.promo-circle {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: promoFloat 6s ease-in-out infinite;
}

.promo-circle-1 {
  top: -50px;
  right: -50px;
  width: 150px;
  height: 150px;
  animation-delay: 0s;
}

.promo-circle-2 {
  bottom: -30px;
  left: -30px;
  width: 100px;
  height: 100px;
  animation-delay: 2s;
}

@keyframes promoFloat {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(10px, 10px) scale(1.1);
  }
}

.promo-content {
  position: relative;
  z-index: 1;
}

.promo-emoji {
  font-size: 48px;
  margin-bottom: 10px;
  animation: promoBounce 2s ease-in-out infinite;
}

@keyframes promoBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.promo-title {
  margin: 0 0 15px 0;
  font-size: 32px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.promo-subtitle {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: 500;
  opacity: 0.95;
}

.promo-date {
  margin: 0 0 20px 0;
  font-size: 16px;
  opacity: 0.9;
}

.promo-code-box {
  margin-top: 20px;
  padding: 15px 25px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  display: inline-block;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  cursor: pointer;
}

.promo-code-box:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
}

.promo-code-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 5px;
}

.promo-code {
  font-size: 24px;
  letter-spacing: 2px;
  display: block;
}

@media (max-width: 640px) {
  .promo-announcement {
    padding: 20px;
  }
  .promo-title {
    font-size: 24px;
  }
  .promo-subtitle {
    font-size: 16px;
  }
  .promo-emoji {
    font-size: 36px;
  }
  .promo-code {
    font-size: 18px;
  }
  .promo-code-box {
    padding: 12px 20px;
  }
}`,
    js_scripts: `document.addEventListener('DOMContentLoaded', function() {
  const codeBox = document.querySelector('.promo-code-box');
  if (codeBox) {
    codeBox.addEventListener('click', function() {
      const code = 'PROMO2024';
      navigator.clipboard.writeText(code).then(function() {
        const originalText = codeBox.innerHTML;
        codeBox.innerHTML = '<div style="font-size: 14px;">✓ Code copié !</div>';
        setTimeout(function() {
          codeBox.innerHTML = originalText;
        }, 2000);
      });
    });
  }
});`
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    type: 'warning' as AnnouncementType,
    content: `<div class="maintenance-announcement">
  <div class="maintenance-header">
    <div class="maintenance-icon">⚠️</div>
    <div class="maintenance-content">
      <h3 class="maintenance-title">Maintenance programmée</h3>
      <div class="maintenance-info-box">
        <div class="maintenance-info-item">
          <span class="maintenance-label">📅 Date:</span>
          <span class="maintenance-value">Samedi 15 janvier 2025</span>
        </div>
        <div class="maintenance-info-item">
          <span class="maintenance-label">⏰ Heure:</span>
          <span class="maintenance-value">02h00 - 06h00</span>
        </div>
      </div>
      <p class="maintenance-description">
        Le service sera temporairement indisponible pour des travaux de maintenance et d'amélioration de nos serveurs.
      </p>
      <p class="maintenance-apology">
        Nous nous excusons pour la gêne occasionnée et vous remercions de votre compréhension.
      </p>
    </div>
  </div>
</div>`,
    css_styles: `.maintenance-announcement {
  background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
  border-left: 6px solid #ffc107;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);
  position: relative;
  animation: maintenancePulse 2s ease-in-out infinite;
}

@keyframes maintenancePulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);
  }
  50% {
    box-shadow: 0 4px 20px rgba(255, 193, 7, 0.4);
  }
}

.maintenance-header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.maintenance-icon {
  font-size: 40px;
  flex-shrink: 0;
  animation: maintenanceShake 3s ease-in-out infinite;
}

@keyframes maintenanceShake {
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-5deg);
  }
  75% {
    transform: rotate(5deg);
  }
}

.maintenance-content {
  flex: 1;
}

.maintenance-title {
  margin: 0 0 12px 0;
  color: #856404;
  font-size: 22px;
  font-weight: bold;
}

.maintenance-info-box {
  background: rgba(255, 255, 255, 0.6);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

.maintenance-info-box:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateX(5px);
}

.maintenance-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.maintenance-info-item:last-child {
  margin-bottom: 0;
}

.maintenance-label {
  color: #856404;
  font-weight: 600;
}

.maintenance-value {
  color: #856404;
  font-weight: 500;
}

.maintenance-description {
  margin: 0 0 8px 0;
  color: #856404;
  font-size: 15px;
  line-height: 1.6;
}

.maintenance-apology {
  margin: 8px 0 0 0;
  color: #856404;
  font-size: 14px;
  font-style: italic;
  padding-top: 8px;
  border-top: 1px solid rgba(133, 100, 4, 0.2);
}

@media (max-width: 640px) {
  .maintenance-announcement {
    padding: 15px;
  }
  .maintenance-header {
    flex-direction: column;
    gap: 10px;
  }
  .maintenance-icon {
    font-size: 32px;
  }
  .maintenance-title {
    font-size: 18px;
  }
  .maintenance-info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}`,
    js_scripts: `document.addEventListener('DOMContentLoaded', function() {
  const maintenanceAnnouncement = document.querySelector('.maintenance-announcement');
  if (maintenanceAnnouncement) {
    const countdown = setInterval(function() {
      const now = new Date();
      const targetDate = new Date('2025-01-15T02:00:00');
      const diff = targetDate - now;
      
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        const countdownEl = document.querySelector('.maintenance-countdown');
        if (countdownEl) {
          countdownEl.textContent = \`Dans \${days}j \${hours}h \${minutes}min\`;
        }
      } else {
        clearInterval(countdown);
      }
    }, 60000);
  }
});`
  },
  {
    id: 'info',
    name: 'Information',
    type: 'info' as AnnouncementType,
    content: `<div class="info-announcement">
  <div class="info-header">
    <div class="info-icon">ℹ️</div>
    <div class="info-content">
      <h3 class="info-title">Information importante</h3>
      <div class="info-box">
        <p class="info-text">
          Nous avons mis à jour nos <strong>conditions générales d'utilisation</strong> et notre <strong>politique de confidentialité</strong>.
        </p>
        <p class="info-text-secondary">
          Veuillez prendre le temps de consulter ces documents pour rester informé de vos droits et de nos engagements.
        </p>
      </div>
      <div class="info-contacts">
        <div class="info-contact-item">
          <div class="info-contact-label">📞 Téléphone</div>
          <a href="tel:+213555123456" class="info-contact-value">+213 555 123 456</a>
        </div>
        <div class="info-contact-item">
          <div class="info-contact-label">✉️ Email</div>
          <a href="mailto:support@tawssil.dz" class="info-contact-value">support@tawssil.dz</a>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css_styles: `.info-announcement {
  background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
  border-left: 6px solid #0c5460;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(12, 84, 96, 0.15);
  animation: infoSlideIn 0.5s ease-out;
}

@keyframes infoSlideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.info-header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.info-icon {
  font-size: 40px;
  flex-shrink: 0;
  animation: infoRotate 4s ease-in-out infinite;
}

@keyframes infoRotate {
  0%, 100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(360deg);
  }
}

.info-content {
  flex: 1;
}

.info-title {
  margin: 0 0 15px 0;
  color: #0c5460;
  font-size: 22px;
  font-weight: bold;
}

.info-box {
  background: rgba(255, 255, 255, 0.7);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.info-box:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(12, 84, 96, 0.1);
}

.info-text {
  margin: 0 0 10px 0;
  color: #0c5460;
  font-size: 15px;
  line-height: 1.6;
}

.info-text-secondary {
  margin: 0;
  color: #0c5460;
  font-size: 14px;
}

.info-contacts {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(12, 84, 96, 0.2);
}

.info-contact-item {
  flex: 1;
  min-width: 150px;
}

.info-contact-label {
  color: #0c5460;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}

.info-contact-value {
  color: #0c5460;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.3s ease;
  display: inline-block;
}

.info-contact-value:hover {
  color: #0a4550;
  text-decoration: underline;
  transform: translateX(3px);
}`,
    js_scripts: `document.addEventListener('DOMContentLoaded', function() {
  const contactLinks = document.querySelectorAll('.info-contact-value');
  contactLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      if (this.href.startsWith('tel:')) {
        console.log('Appel téléphonique:', this.textContent);
      } else if (this.href.startsWith('mailto:')) {
        console.log('Envoi email:', this.textContent);
      }
    });
  });
});`
  },
  {
    id: 'alert',
    name: 'Alerte',
    type: 'error' as AnnouncementType,
    content: `<div class="alert-announcement">
  <div class="alert-circle"></div>
  <div class="alert-content-wrapper">
    <div class="alert-header">
      <div class="alert-icon">🚨</div>
      <div class="alert-main">
        <h3 class="alert-title">Alerte importante</h3>
        <div class="alert-box">
          <p class="alert-message">
            <strong>⚠️ Attention :</strong> Des retards de livraison sont à prévoir dans la région d'<strong>Alger</strong> en raison des conditions météorologiques difficiles (pluie et vent fort).
          </p>
          <div class="alert-zones">
            <span class="alert-zones-label">📍 Zones concernées:</span>
            <span class="alert-zones-value">Alger Centre, Hydra, El Biar</span>
          </div>
        </div>
        <p class="alert-apology">
          Nous vous remercions de votre compréhension et mettons tout en œuvre pour minimiser les désagréments. Les commandes seront traitées dès que les conditions le permettront.
        </p>
      </div>
    </div>
  </div>
</div>`,
    css_styles: `.alert-announcement {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  border-left: 6px solid #dc3545;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
  position: relative;
  overflow: hidden;
  animation: alertFlash 3s ease-in-out infinite;
}

@keyframes alertFlash {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
  }
  50% {
    box-shadow: 0 4px 20px rgba(220, 53, 69, 0.4);
  }
}

.alert-circle {
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: rgba(220, 53, 69, 0.1);
  border-radius: 50%;
  transform: translate(30px, -30px);
  animation: alertPulse 2s ease-in-out infinite;
}

@keyframes alertPulse {
  0%, 100% {
    transform: translate(30px, -30px) scale(1);
    opacity: 0.5;
  }
  50% {
    transform: translate(30px, -30px) scale(1.2);
    opacity: 0.8;
  }
}

.alert-content-wrapper {
  position: relative;
  z-index: 1;
}

.alert-header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.alert-icon {
  font-size: 40px;
  flex-shrink: 0;
  animation: alertShake 1s ease-in-out infinite;
}

@keyframes alertShake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

.alert-main {
  flex: 1;
}

.alert-title {
  margin: 0 0 15px 0;
  color: #721c24;
  font-size: 22px;
  font-weight: bold;
}

.alert-box {
  background: rgba(255, 255, 255, 0.6);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid rgba(114, 28, 36, 0.2);
  transition: all 0.3s ease;
}

.alert-box:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateX(5px);
}

.alert-message {
  margin: 0 0 10px 0;
  color: #721c24;
  font-size: 15px;
  line-height: 1.6;
}

.alert-zones {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(114, 28, 36, 0.2);
}

.alert-zones-label {
  color: #721c24;
  font-size: 14px;
}

.alert-zones-value {
  color: #721c24;
  font-size: 14px;
  font-weight: 600;
}

.alert-apology {
  margin: 0;
  color: #721c24;
  font-size: 14px;
  font-style: italic;
  padding-top: 8px;
  border-top: 1px solid rgba(114, 28, 36, 0.2);
}`,
    js_scripts: `document.addEventListener('DOMContentLoaded', function() {
  const alertAnnouncement = document.querySelector('.alert-announcement');
  if (alertAnnouncement) {
    // Ajouter un effet de clignotement pour attirer l'attention
    let blinkCount = 0;
    const blinkInterval = setInterval(function() {
      alertAnnouncement.style.opacity = alertAnnouncement.style.opacity === '0.9' ? '1' : '0.9';
      blinkCount++;
      if (blinkCount >= 6) {
        clearInterval(blinkInterval);
        alertAnnouncement.style.opacity = '1';
      }
    }, 500);
  }
});`
  },
  {
    id: 'new-feature',
    name: 'Nouvelle fonctionnalité',
    type: 'success' as AnnouncementType,
    content: `<div class="feature-announcement">
  <div class="feature-header">
    <div class="feature-icon">✨</div>
    <div class="feature-content">
      <h3 class="feature-title">Nouvelle fonctionnalité disponible !</h3>
      <div class="feature-box">
        <div class="feature-name">📍 Suivi en temps réel de votre commande</div>
        <p class="feature-description">
          Suivez votre livreur en direct sur une carte interactive et recevez des notifications à chaque étape :
        </p>
        <ul class="feature-list">
          <li>Préparation de votre commande</li>
          <li>Envoi en livraison</li>
          <li>Position du livreur en temps réel</li>
          <li>Arrivée imminente</li>
        </ul>
      </div>
      <div class="feature-availability">
        <span class="feature-emoji">💡</span>
        <span>Disponible dès maintenant dans l'application mobile iOS et Android</span>
      </div>
    </div>
  </div>
</div>`,
    css_styles: `.feature-announcement {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border-left: 6px solid #28a745;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
  animation: featureGlow 3s ease-in-out infinite;
}

@keyframes featureGlow {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
  }
  50% {
    box-shadow: 0 4px 20px rgba(40, 167, 69, 0.4);
  }
}

.feature-header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.feature-icon {
  font-size: 40px;
  flex-shrink: 0;
  animation: featureSparkle 2s ease-in-out infinite;
}

@keyframes featureSparkle {
  0%, 100% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.1) rotate(-10deg);
  }
  75% {
    transform: scale(1.1) rotate(10deg);
  }
}

.feature-content {
  flex: 1;
}

.feature-title {
  margin: 0 0 15px 0;
  color: #155724;
  font-size: 22px;
  font-weight: bold;
}

.feature-box {
  background: rgba(255, 255, 255, 0.7);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.feature-box:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(21, 87, 36, 0.1);
}

.feature-name {
  color: #155724;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.feature-description {
  margin: 0 0 10px 0;
  color: #155724;
  font-size: 14px;
  line-height: 1.6;
}

.feature-list {
  margin: 0;
  padding-left: 20px;
  color: #155724;
  font-size: 14px;
  line-height: 1.8;
}

.feature-list li {
  margin-bottom: 4px;
  position: relative;
  transition: all 0.3s ease;
}

.feature-list li:hover {
  transform: translateX(5px);
  color: #0d4121;
}

.feature-list li::marker {
  color: #28a745;
}

.feature-availability {
  background: rgba(40, 167, 69, 0.15);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(21, 87, 36, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #155724;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.feature-availability:hover {
  background: rgba(40, 167, 69, 0.25);
  transform: scale(1.02);
}

.feature-emoji {
  font-size: 18px;
  animation: featurePulse 2s ease-in-out infinite;
}

@keyframes featurePulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}`,
    js_scripts: `document.addEventListener('DOMContentLoaded', function() {
  const featureList = document.querySelectorAll('.feature-list li');
  featureList.forEach(function(item, index) {
    item.style.animationDelay = (index * 0.2) + 's';
    item.style.animation = 'featureSlideIn 0.5s ease-out forwards';
    item.style.opacity = '0';
  });
});

// Animation pour les éléments de liste
const style = document.createElement('style');
style.textContent = \`
  @keyframes featureSlideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
\`;
document.head.appendChild(style);`
  },
  {
    id: 'event',
    name: 'Événement',
    type: 'info' as AnnouncementType,
    content: `<div class="event-announcement">
  <div class="event-circle event-circle-1"></div>
  <div class="event-circle event-circle-2"></div>
  <div class="event-content">
    <div class="event-emoji">🎊</div>
    <h2 class="event-title">Grand Événement Tawssil</h2>
    <p class="event-subtitle">Festival de la Gastronomie Algérienne</p>
    <p class="event-description">Découvrez les saveurs authentiques de l'Algérie</p>
    <div class="event-info-cards">
      <div class="event-card">
        <div class="event-card-label">📅 DATES</div>
        <div class="event-card-value">15-20 Janvier</div>
        <div class="event-card-year">2025</div>
      </div>
      <div class="event-card">
        <div class="event-card-label">📍 LIEU</div>
        <div class="event-card-value">Alger Centre</div>
        <div class="event-card-detail">Place de la République</div>
      </div>
    </div>
    <div class="event-cta">
      <p class="event-cta-text">Réservez votre table dès maintenant</p>
      <p class="event-cta-promo">Profitez de <strong class="event-discount">-20%</strong> sur toutes les commandes !</p>
    </div>
  </div>
</div>`,
    css_styles: `.event-announcement {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 30px;
  border-radius: 16px;
  color: white;
  text-align: center;
  box-shadow: 0 8px 16px rgba(245, 87, 108, 0.3);
  position: relative;
  overflow: hidden;
  animation: eventFadeIn 0.6s ease-out;
}

@keyframes eventFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.event-circle {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: eventFloat 8s ease-in-out infinite;
}

.event-circle-1 {
  top: -40px;
  left: -40px;
  width: 120px;
  height: 120px;
  animation-delay: 0s;
}

.event-circle-2 {
  bottom: -30px;
  right: -30px;
  width: 100px;
  height: 100px;
  animation-delay: 2s;
}

@keyframes eventFloat {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(15px, 15px) scale(1.15);
  }
}

.event-content {
  position: relative;
  z-index: 1;
}

.event-emoji {
  font-size: 48px;
  margin-bottom: 10px;
  animation: eventBounce 2.5s ease-in-out infinite;
}

@keyframes eventBounce {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-10px) rotate(-5deg);
  }
  75% {
    transform: translateY(-10px) rotate(5deg);
  }
}

.event-title {
  margin: 0 0 10px 0;
  font-size: 32px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.event-subtitle {
  margin: 0 0 15px 0;
  font-size: 20px;
  font-weight: 500;
  opacity: 0.95;
}

.event-description {
  margin: 0 0 25px 0;
  font-size: 16px;
  opacity: 0.9;
}

.event-info-cards {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.event-card {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  min-width: 140px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.event-card:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.event-card-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 5px;
  font-weight: 500;
}

.event-card-value {
  font-size: 18px;
  font-weight: bold;
}

.event-card-year,
.event-card-detail {
  font-size: 14px;
  opacity: 0.9;
}

.event-cta {
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.event-cta:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.02);
}

.event-cta-text {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.event-cta-promo {
  margin: 5px 0 0 0;
  font-size: 14px;
  opacity: 0.95;
}

.event-discount {
  font-size: 18px;
  animation: eventPulse 2s ease-in-out infinite;
}

@keyframes eventPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}`,
    js_scripts: `document.addEventListener('DOMContentLoaded', function() {
  const eventCards = document.querySelectorAll('.event-card');
  eventCards.forEach(function(card) {
    card.addEventListener('click', function() {
      this.style.animation = 'eventCardClick 0.3s ease';
      setTimeout(function() {
        card.style.animation = '';
      }, 300);
    });
  });
});

const eventStyle = document.createElement('style');
eventStyle.textContent = \`
  @keyframes eventCardClick {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
\`;
document.head.appendChild(eventStyle);`
  },
  {
    id: 'livraison-gratuite',
    name: 'Livraison gratuite',
    type: 'success' as AnnouncementType,
    content: `<div class="delivery-announcement">
  <div class="delivery-circle delivery-circle-1"></div>
  <div class="delivery-circle delivery-circle-2"></div>
  <div class="delivery-content">
    <div class="delivery-emoji">🚚</div>
    <h2 class="delivery-title">LIVRAISON GRATUITE</h2>
    <div class="delivery-threshold">
      <div class="delivery-threshold-label">Pour commandes de</div>
      <div class="delivery-threshold-amount">2000 DA</div>
      <div class="delivery-threshold-text">et plus</div>
    </div>
    <p class="delivery-description">Profitez-en dès maintenant ! Offre valable sur tous les restaurants partenaires.</p>
    <div class="delivery-code-box">
      <div class="delivery-code-label">CODE PROMO</div>
      <strong class="delivery-code">LIVRAISON0</strong>
    </div>
  </div>
</div>`,
    css_styles: `.delivery-announcement {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  padding: 30px;
  border-radius: 16px;
  color: white;
  text-align: center;
  box-shadow: 0 8px 16px rgba(56, 239, 125, 0.3);
  position: relative;
  overflow: hidden;
  animation: deliverySlideIn 0.5s ease-out;
}

@keyframes deliverySlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.delivery-circle {
  position: absolute;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  animation: deliveryFloat 6s ease-in-out infinite;
}

.delivery-circle-1 {
  top: -50px;
  right: -50px;
  width: 150px;
  height: 150px;
  animation-delay: 0s;
}

.delivery-circle-2 {
  bottom: -40px;
  left: -40px;
  width: 120px;
  height: 120px;
  animation-delay: 2s;
}

@keyframes deliveryFloat {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(10px, 10px) scale(1.1);
  }
}

.delivery-content {
  position: relative;
  z-index: 1;
}

.delivery-emoji {
  font-size: 56px;
  margin-bottom: 15px;
  animation: deliveryMove 3s ease-in-out infinite;
}

@keyframes deliveryMove {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

.delivery-title {
  margin: 0 0 15px 0;
  font-size: 36px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.delivery-threshold {
  background: rgba(255, 255, 255, 0.25);
  padding: 15px 25px;
  border-radius: 12px;
  display: inline-block;
  margin-bottom: 15px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.delivery-threshold:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
}

.delivery-threshold-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 5px;
}

.delivery-threshold-amount {
  font-size: 32px;
  font-weight: bold;
  animation: deliveryPulse 2s ease-in-out infinite;
}

@keyframes deliveryPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.delivery-threshold-text {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 5px;
}

.delivery-description {
  margin: 0 0 20px 0;
  font-size: 16px;
  opacity: 0.95;
  line-height: 1.5;
}

.delivery-code-box {
  margin-top: 20px;
  padding: 15px 25px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  display: inline-block;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
  cursor: pointer;
}

.delivery-code-box:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.delivery-code-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 5px;
  font-weight: 500;
}

.delivery-code {
  font-size: 24px;
  letter-spacing: 3px;
  display: block;
}`,
    js_scripts: `document.addEventListener('DOMContentLoaded', function() {
  const codeBox = document.querySelector('.delivery-code-box');
  if (codeBox) {
    codeBox.addEventListener('click', function() {
      const code = 'LIVRAISON0';
      navigator.clipboard.writeText(code).then(function() {
        const originalText = codeBox.innerHTML;
        codeBox.innerHTML = '<div style="font-size: 14px;">✓ Code copié !</div>';
        setTimeout(function() {
          codeBox.innerHTML = originalText;
        }, 2000);
      });
    });
  }
});`
  },
  {
    id: 'nouveau-restaurant',
    name: 'Nouveau restaurant',
    type: 'info' as AnnouncementType,
    content: `<div class="restaurant-announcement">
  <div class="restaurant-circle restaurant-circle-1"></div>
  <div class="restaurant-circle restaurant-circle-2"></div>
  <div class="restaurant-content">
    <div class="restaurant-emoji">🍕</div>
    <h2 class="restaurant-title">Nouveau Restaurant !</h2>
    <p class="restaurant-name">Bienvenue chez "La Piazza"</p>
    <p class="restaurant-description">Découvrez nos pizzas artisanales au feu de bois et nos spécialités italiennes authentiques</p>
    <div class="restaurant-stats">
      <div class="restaurant-stat-card">
        <div class="restaurant-stat-label">⭐ NOTE</div>
        <div class="restaurant-stat-value">4.8</div>
        <div class="restaurant-stat-detail">/ 5.0</div>
      </div>
      <div class="restaurant-stat-card">
        <div class="restaurant-stat-label">⏱️ LIVRAISON</div>
        <div class="restaurant-stat-value">30-45</div>
        <div class="restaurant-stat-detail">minutes</div>
      </div>
      <div class="restaurant-stat-card">
        <div class="restaurant-stat-label">🍽️ CATÉGORIE</div>
        <div class="restaurant-stat-value-small">Italienne</div>
        <div class="restaurant-stat-detail">Pizza, Pasta</div>
      </div>
    </div>
    <div class="restaurant-welcome">
      <p class="restaurant-welcome-title">🎁 Offre de bienvenue</p>
      <p class="restaurant-welcome-text">Bénéficiez de <strong class="restaurant-discount">-15%</strong> sur votre première commande !</p>
    </div>
  </div>
</div>`,
    css_styles: `.restaurant-announcement {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  border-radius: 16px;
  color: white;
  text-align: center;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
  animation: restaurantFadeIn 0.6s ease-out;
}

@keyframes restaurantFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.restaurant-circle {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: restaurantFloat 7s ease-in-out infinite;
}

.restaurant-circle-1 {
  top: -40px;
  right: -40px;
  width: 120px;
  height: 120px;
  animation-delay: 0s;
}

.restaurant-circle-2 {
  bottom: -30px;
  left: -30px;
  width: 100px;
  height: 100px;
  animation-delay: 2s;
}

@keyframes restaurantFloat {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(12px, 12px) scale(1.12);
  }
}

.restaurant-content {
  position: relative;
  z-index: 1;
}

.restaurant-emoji {
  font-size: 48px;
  margin-bottom: 10px;
  animation: restaurantRotate 4s ease-in-out infinite;
}

@keyframes restaurantRotate {
  0%, 100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-10deg) scale(1.1);
  }
  75% {
    transform: rotate(10deg) scale(1.1);
  }
}

.restaurant-title {
  margin: 0 0 10px 0;
  font-size: 32px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.restaurant-name {
  margin: 0 0 15px 0;
  font-size: 22px;
  font-weight: 500;
  opacity: 0.95;
}

.restaurant-description {
  margin: 0 0 25px 0;
  font-size: 16px;
  opacity: 0.9;
  line-height: 1.5;
}

.restaurant-stats {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.restaurant-stat-card {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  min-width: 120px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.restaurant-stat-card:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.restaurant-stat-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 5px;
  font-weight: 500;
}

.restaurant-stat-value {
  font-size: 24px;
  font-weight: bold;
}

.restaurant-stat-value-small {
  font-size: 18px;
  font-weight: bold;
}

.restaurant-stat-detail {
  font-size: 14px;
  opacity: 0.9;
}

.restaurant-welcome {
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.restaurant-welcome:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.02);
}

.restaurant-welcome-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.restaurant-welcome-text {
  margin: 5px 0 0 0;
  font-size: 14px;
  opacity: 0.95;
}

.restaurant-discount {
  font-size: 20px;
  animation: restaurantPulse 2s ease-in-out infinite;
}

@keyframes restaurantPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}`,
    js_scripts: `document.addEventListener('DOMContentLoaded', function() {
  const statCards = document.querySelectorAll('.restaurant-stat-card');
  statCards.forEach(function(card, index) {
    card.style.animationDelay = (index * 0.1) + 's';
    card.style.animation = 'restaurantCardSlide 0.5s ease-out forwards';
    card.style.opacity = '0';
  });
});

const restaurantStyle = document.createElement('style');
restaurantStyle.textContent = \`
  @keyframes restaurantCardSlide {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
\`;
document.head.appendChild(restaurantStyle);`
  }
];

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | AnnouncementType>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [restaurantError, setRestaurantError] = useState<string>('');
  
  // Builder state
  const [builderTab, setBuilderTab] = useState<BuilderTab>('content');
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    css_styles: '',
    js_scripts: '',
    type: 'info',
    is_active: true,
    start_date: '',
    end_date: '',
    restaurant_id: ''
  });

  // Fetch announcements
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    let active = true;
    const isRestaurantEntry = (entry: { id: string; name: string } | null): entry is { id: string; name: string } =>
      Boolean(entry);

    const loadRestaurants = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Non authentifié');
        }
        const response = await fetch(`${API_URL}/restaurant/getall`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Impossible de charger la liste des restaurants');
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];

        if (!active) {
          return;
        }

        const formatted: { id: string; name: string }[] = list
          .map((entry: { id?: string; name?: string; company_name?: string }) => {
            if (!entry?.id) {
              return null;
            }
            const label = entry.name ?? entry.company_name ?? String(entry.id);
            return { id: entry.id, name: label };
          })
          .filter(isRestaurantEntry)
          .sort((a: { id: string; name: string }, b: { id: string; name: string }) =>
            a.name.localeCompare(b.name)
          );

        setRestaurants(formatted);
        setRestaurantError('');
      } catch (err: any) {
        console.error('Erreur fetch restaurants:', err);
        if (active) {
          setRestaurantError(err?.message || 'Impossible de charger les restaurants');
        }
      }
    };

    loadRestaurants();
    return () => {
      active = false;
    };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/announcement/getall`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des annonces');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setAnnouncements(data.data as Announcement[]);
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (err: any) {
      console.error('Erreur fetch announcements:', err);
      setError(err?.message || 'Impossible de charger les annonces');
    } finally {
      setLoading(false);
    }
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter((announcement) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      announcement.title?.toLowerCase().includes(search) ||
      announcement.content?.toLowerCase().includes(search);

    const matchesType =
      filterType === 'all' || announcement.type === filterType;

    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && announcement.is_active) ||
      (filterActive === 'inactive' && !announcement.is_active);

    return matchesSearch && matchesType && matchesActive;
  });

  // Handle actions
  const handleLoadTemplate = (template: typeof ANNOUNCEMENT_TEMPLATES[0]) => {
    setFormData({
      title: template.name,
      content: template.content,
      css_styles: template.css_styles || '',
      js_scripts: template.js_scripts || '',
      type: template.type,
      is_active: true,
      start_date: '',
      end_date: '',
      restaurant_id: ''
    });
    setShowTemplateMenu(false);
    setBuilderTab('content');
  };

  const handleAction = (announcement: Announcement | null, type: ModalType) => {
    setSelectedAnnouncement(announcement);
    setFormErrors({});

    if (type === 'create') {
      setFormData({
        title: '',
        content: '',
        css_styles: '',
        js_scripts: '',
        type: 'info',
        is_active: true,
        start_date: '',
        end_date: '',
        restaurant_id: ''
      });
    } else if (type === 'edit' && announcement) {
      setFormData({
        title: announcement.title,
        content: announcement.content,
        css_styles: announcement.css_styles || '',
        js_scripts: announcement.js_scripts || '',
        type: announcement.type,
        is_active: announcement.is_active,
        start_date: announcement.start_date ? announcement.start_date.split('T')[0] : '',
        end_date: announcement.end_date ? announcement.end_date.split('T')[0] : '',
        restaurant_id: announcement.restaurant_id ?? ''
      });
    }

    setModalType(type);
    setShowModal(true);
    setBuilderTab('content');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAnnouncement(null);
    setModalType('');
    setFormData({
      title: '',
      content: '',
      css_styles: '',
      js_scripts: '',
      type: 'info',
      is_active: true,
      start_date: '',
      end_date: ''
    });
    setSaveLoading(false);
    setError('');
    setFormErrors({});
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setError('');
      setFormErrors({});

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Validation
      const errors: Record<string, string> = {};
      
      if (!formData.title?.trim()) {
        errors.title = 'Le titre est requis';
      }
      if (!formData.content?.trim()) {
        errors.content = 'Le contenu est requis';
      }
      
      // Validation des dates (obligatoires pour la création)
      if (modalType === 'create') {
        if (!formData.start_date?.trim()) {
          errors.start_date = 'La date de début est obligatoire';
        }
        if (!formData.end_date?.trim()) {
          errors.end_date = 'La date de fin est obligatoire';
        }
        
        // Vérifier que la date de fin est après la date de début
        if (formData.start_date && formData.end_date) {
          const startDate = new Date(formData.start_date);
          const endDate = new Date(formData.end_date);
          if (endDate < startDate) {
            errors.end_date = 'La date de fin doit être après la date de début';
          }
        }
      } else if (modalType === 'edit' && formData.start_date && formData.end_date) {
        // Validation pour l'édition si les dates sont remplies
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        if (endDate < startDate) {
          errors.end_date = 'La date de fin doit être après la date de début';
        }
      }
      
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setSaveLoading(false);
        return;
      }

      const payload = {
        title: formData.title,
        content: formData.content,
        css_styles: formData.css_styles || '',
        js_scripts: formData.js_scripts || '',
        type: formData.type,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        restaurant_id: formData.restaurant_id || null
      };

      let response;
      if (modalType === 'create') {
        response = await fetch(`${API_URL}/announcement/create`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else if (modalType === 'edit' && selectedAnnouncement) {
        response = await fetch(`${API_URL}/announcement/update/${selectedAnnouncement.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        throw new Error('Action invalide');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la sauvegarde');
      }

      const data = await response.json();

      if (data.success) {
        await fetchAnnouncements();
        handleCloseModal();
      } else {
        throw new Error('Échec de la sauvegarde');
      }
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError(err?.message || 'Impossible de sauvegarder');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) {
      setError('Aucune annonce sélectionnée');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_URL}/announcement/delete/${selectedAnnouncement.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }

      const data = await response.json();

      if (data.success) {
        await fetchAnnouncements();
        handleCloseModal();
      } else {
        throw new Error('Échec de la suppression');
      }
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      setError(err?.message || 'Impossible de supprimer');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleInputChange = (field: keyof Announcement, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    if (field === 'restaurant_id') {
      setRestaurantError('');
    }
    // Effacer l'erreur du champ modifié
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case 'info':
        return <Info className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: AnnouncementType) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Close template menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTemplateMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setShowTemplateMenu(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showTemplateMenu]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full">
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Annonces</h1>
              <p className="mt-1 text-sm text-gray-500">
                {filteredAnnouncements.length} annonce
                {filteredAnnouncements.length > 1 ? 's' : ''} trouvée
                {filteredAnnouncements.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
              <button
                onClick={fetchAnnouncements}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {loading ? 'Chargement...' : 'Actualiser'}
              </button>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTemplateMenu(!showTemplateMenu);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <LayoutTemplate className="w-5 h-5" />
                  Depuis Template
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showTemplateMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
                    {ANNOUNCEMENT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTemplateMenu(false);
                          // Ouvrir le modal d'abord
                          setModalType('create');
                          setShowModal(true);
                          setBuilderTab('content');
                          // Puis charger le template
                          setTimeout(() => {
                            setFormData({
                              title: template.name,
                              content: template.content,
                              css_styles: template.css_styles || '',
                              js_scripts: template.js_scripts || '',
                              type: template.type,
                              is_active: true,
                              start_date: '',
                              end_date: ''
                            });
                          }, 0);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          template.type === 'info' ? 'bg-blue-500' :
                          template.type === 'success' ? 'bg-green-500' :
                          template.type === 'warning' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        {template.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowTemplateMenu(false);
                  handleAction(null, 'create');
                }}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouvelle Annonce
              </button>
            </div>
          </div>

          {/* Message d'erreur global */}
          {error && !showModal && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Barre de recherche et filtres */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par titre ou contenu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="w-full sm:w-48 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">Tous les types</option>
              <option value="info">Info</option>
              <option value="success">Succès</option>
              <option value="warning">Attention</option>
              <option value="error">Erreur</option>
            </select>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
              className="w-full sm:w-48 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Annonce
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Restaurant
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Période
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Création
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnnouncements.map((announcement) => (
                    <tr key={announcement.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 lg:px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {announcement.title}
                          </div>
                          <div 
                            className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: announcement.content }}
                            style={{ 
                              maxHeight: '3rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%',
                              wordBreak: 'break-word'
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {announcement.restaurant?.name ?? 'Global'}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(announcement.type)}`}>
                          {getTypeIcon(announcement.type)}
                          <span className="ml-1 capitalize">{announcement.type}</span>
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {announcement.start_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{formatDate(announcement.start_date)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Aucune date</span>
                          )}
                          {announcement.end_date && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <span>→ {formatDate(announcement.end_date)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            announcement.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {announcement.is_active ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(announcement.created_at)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(announcement, 'view')}
                            className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(announcement, 'edit')}
                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(announcement, 'delete')}
                            className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredAnnouncements.map((announcement) => (
                <div key={announcement.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 flex-1 pr-2">
                      {announcement.title}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleAction(announcement, 'view')}
                        className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction(announcement, 'edit')}
                        className="text-blue-600 hover:text-blue-900 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction(announcement, 'delete')}
                        className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div 
                    className="text-xs text-gray-600 mb-3 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: announcement.content }}
                    style={{ 
                      maxHeight: '2.5rem',
                      overflow: 'hidden'
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${getTypeBadgeColor(announcement.type)}`}>
                      {getTypeIcon(announcement.type)}
                      <span className="ml-1 capitalize">{announcement.type}</span>
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 font-medium">
                      {announcement.restaurant?.name ?? 'Global'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        announcement.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {announcement.is_active ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                    {announcement.start_date && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(announcement.start_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredAnnouncements.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900">
                  Aucune annonce trouvée
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Essayez de modifier vos critères de recherche ou créez une nouvelle annonce
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {modalType === 'view' && 'Détails de l\'Annonce'}
                {modalType === 'edit' && 'Modifier l\'Annonce'}
                {modalType === 'create' && 'Nouvelle Annonce'}
                {modalType === 'delete' && 'Confirmer la Suppression'}
                {modalType === 'preview' && 'Aperçu de l\'Annonce'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-6 py-4">
              {/* Error message */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Erreur</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {modalType === 'delete' ? (
                <div className="text-center py-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Êtes-vous sûr de vouloir supprimer cette annonce ?
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    <strong>{selectedAnnouncement?.title}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Cette action est irréversible.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleCloseModal}
                      disabled={saveLoading}
                      className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={saveLoading}
                      className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saveLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Suppression...
                        </>
                      ) : (
                        'Supprimer'
                      )}
                    </button>
                  </div>
                </div>
              ) : modalType === 'view' && selectedAnnouncement ? (
                <div className="space-y-6">
                  {/* Title and Type */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {selectedAnnouncement.title}
                      </h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getTypeBadgeColor(selectedAnnouncement.type)}`}>
                        {getTypeIcon(selectedAnnouncement.type)}
                        <span className="ml-1 capitalize">{selectedAnnouncement.type}</span>
                      </span>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contenu
                    </label>
                    <div 
                      className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
                      style={{
                        ...(selectedAnnouncement.css_styles ? {} : {}),
                        maxWidth: '100%'
                      }}
                    />
                    {selectedAnnouncement.css_styles && (
                      <style>{selectedAnnouncement.css_styles}</style>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de début
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedAnnouncement.start_date ? formatDate(selectedAnnouncement.start_date) : 'Non définie'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de fin
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedAnnouncement.end_date ? formatDate(selectedAnnouncement.end_date) : 'Non définie'}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedAnnouncement.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedAnnouncement.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Restaurant
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedAnnouncement.restaurant?.name ?? 'Global'}
                    </p>
                  </div>

                  {/* Custom Styles */}
                  {(selectedAnnouncement.css_styles || selectedAnnouncement.js_scripts) && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Personnalisation</h4>
                      {selectedAnnouncement.css_styles && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Palette className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">CSS personnalisé</span>
                          </div>
                          <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                            {selectedAnnouncement.css_styles}
                          </pre>
                        </div>
                      )}
                      {selectedAnnouncement.js_scripts && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Code className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">JavaScript</span>
                          </div>
                          <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                            {selectedAnnouncement.js_scripts}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (modalType === 'edit' || modalType === 'create') ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Titre de l'annonce"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.type || 'info'}
                          onChange={(e) => handleInputChange('type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="info">Info</option>
                          <option value="success">Succès</option>
                          <option value="warning">Attention</option>
                          <option value="error">Erreur</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Statut
                        </label>
                        <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formData.is_active}
                            onChange={(e) => handleInputChange('is_active', e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">Annonce active</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Restaurant (optionnel)
                      </label>
                      <select
                        value={formData.restaurant_id || ''}
                        onChange={(e) => handleInputChange('restaurant_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      >
                        <option value="">Global</option>
                        {restaurants.map((restaurant) => (
                          <option key={restaurant.id} value={restaurant.id}>
                            {restaurant.name}
                          </option>
                        ))}
                      </select>
                      {restaurantError && (
                        <p className="mt-1 text-xs text-red-600">{restaurantError}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de début {modalType === 'create' && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="date"
                          value={formData.start_date || ''}
                          onChange={(e) => handleInputChange('start_date', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                            formErrors.start_date 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'border-gray-300'
                          }`}
                        />
                        {formErrors.start_date && (
                          <p className="mt-1 text-xs text-red-600">{formErrors.start_date}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de fin {modalType === 'create' && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="date"
                          value={formData.end_date || ''}
                          onChange={(e) => handleInputChange('end_date', e.target.value)}
                          min={formData.start_date || undefined}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                            formErrors.end_date 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'border-gray-300'
                          }`}
                        />
                        {formErrors.end_date && (
                          <p className="mt-1 text-xs text-red-600">{formErrors.end_date}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Builder Tabs */}
                  <div>
                    <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
                      <button
                        onClick={() => setBuilderTab('content')}
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          builderTab === 'content'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4 inline-block mr-1 sm:mr-2" />
                        Contenu
                      </button>
                      <button
                        onClick={() => setBuilderTab('css')}
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          builderTab === 'css'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Palette className="w-3 h-3 sm:w-4 sm:h-4 inline-block mr-1 sm:mr-2" />
                        CSS
                      </button>
                      <button
                        onClick={() => setBuilderTab('javascript')}
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          builderTab === 'javascript'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Code className="w-3 h-3 sm:w-4 sm:h-4 inline-block mr-1 sm:mr-2" />
                        JavaScript
                      </button>
                    </div>

                    {/* Tab Content */}
                    {builderTab === 'content' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contenu HTML <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.content || ''}
                          onChange={(e) => handleInputChange('content', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                          rows={12}
                          placeholder="<div>Votre contenu HTML ici...</div>"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Vous pouvez utiliser du HTML pour formater votre annonce
                        </p>
                      </div>
                    )}

                    {builderTab === 'css' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Styles CSS personnalisés (optionnel)
                        </label>
                        <textarea
                          value={formData.css_styles || ''}
                          onChange={(e) => handleInputChange('css_styles', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                          rows={12}
                          placeholder=".announcement { color: #333; }"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Ajoutez vos styles CSS personnalisés (sans balise &lt;style&gt;)
                        </p>
                      </div>
                    )}

                    {builderTab === 'javascript' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          JavaScript personnalisé (optionnel)
                        </label>
                        <textarea
                          value={formData.js_scripts || ''}
                          onChange={(e) => handleInputChange('js_scripts', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                          rows={12}
                          placeholder="console.log('Hello');"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Ajoutez votre code JavaScript (sans balise &lt;script&gt;)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aperçu
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50 min-h-[100px] overflow-x-auto">
                      {formData.content ? (
                        <>
                          {formData.css_styles && (
                            <style>{formData.css_styles}</style>
                          )}
                          <div 
                            dangerouslySetInnerHTML={{ __html: formData.content }}
                            style={{ maxWidth: '100%' }}
                          />
                          {formData.js_scripts && (
                            <script dangerouslySetInnerHTML={{ __html: formData.js_scripts }} />
                          )}
                        </>
                      ) : (
                        <p className="text-gray-400 text-sm italic">L'aperçu apparaîtra ici...</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            {modalType !== 'delete' && modalType !== 'view' && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  disabled={saveLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saveLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {modalType === 'create' ? 'Créer' : 'Enregistrer'}
                    </>
                  )}
                </button>
              </div>
            )}

            {modalType === 'view' && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
