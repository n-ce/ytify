import { render } from 'solid-js/web';
import { setStore } from '@lib/stores';
import { setConfig } from '@lib/utils/config';
import './Welcome.css';

export default function Welcome() {
  const features = [
    {
      icon: 'ri-music-2-fill',
      title: 'Stream Any Music',
      description: 'Search and play millions of songs from YouTube Music'
    },
    {
      icon: 'ri-heart-fill',
      title: 'Build Your Library',
      description: 'Save favorites, create playlists, track your listening'
    },
    {
      icon: 'ri-cloud-fill',
      title: 'Sync Everywhere',
      description: 'Sign in to sync your library across all devices'
    }
  ];

  const handleGetStarted = () => {
    setConfig('home', 'Search');
    setStore('homeView', 'Search');
    localStorage.setItem('onboarding_complete', 'true');
  };

  const handleSignIn = () => {
    import('@components/Login').then((Login) => {
      render(() => <Login.default />, document.body);
    });
  };

  return (
    <div class="welcome">
      <div class="welcome-hero">
        <div class="welcome-logo">
          <i class="ri-music-2-fill"></i>
        </div>
        <h1 class="welcome-title">Welcome to Ytify</h1>
        <p class="welcome-subtitle">
          Your free, privacy-focused music streaming app
        </p>
      </div>

      <div class="welcome-features">
        {features.map((feature, index) => (
          <div
            class={`feature-card feature-card-${index}`}
          >
            <div class="feature-icon">
              <i class={feature.icon}></i>
            </div>
            <div class="feature-content">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div class="welcome-actions">
        <button type="button" class="primary-cta" onclick={handleGetStarted}>
          <i class="ri-search-2-line"></i>
          Start Exploring
        </button>

        <button type="button" class="secondary-cta" onclick={handleSignIn}>
          <i class="ri-user-add-line"></i>
          Sign In to Sync
        </button>
      </div>

      <div class="welcome-footer">
        <a href="https://github.com/n-ce/ytify/wiki/usage" target="_blank" rel="noopener">
          Learn how to use
        </a>
        <span class="divider">|</span>
        <a href="https://t.me/ytifytg" target="_blank" rel="noopener">
          Join community
        </a>
      </div>
    </div>
  );
}
