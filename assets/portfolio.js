(() => {
  const videos = [...document.querySelectorAll('video')];
  // Muted autoplay while in view, unless the reader prefers reduced motion or saves data.
  const autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData;
  document.querySelectorAll('.media-player').forEach(player => {
    const video = player.querySelector('video');
    const button = player.querySelector('.poster-play');
    if (!video || !button) return;
    button.hidden = autoplay;
    button.addEventListener('click', () => {
      button.querySelector('.play-label').textContent = 'Loading video…';
      // Posters of videos with sound promise it; the click allows unmuting, one video at a time.
      if (player.querySelector('.sound-toggle')) {
        videos.forEach(other => { if (other !== video) other.muted = true; });
        video.muted = false;
        video.dataset.soundOn = '1';
      }
      video.play().catch(() => {
        button.hidden = true;
        video.focus();
      });
    });
    video.addEventListener('playing', () => { button.hidden = true; });
    video.addEventListener('error', () => { button.hidden = true; });
  });
  if (autoplay && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(({ target: video, isIntersecting }) => {
      if (isIntersecting) {
        if (video.dataset.userPaused || video.ended) return;
        video.muted = video.muted || !video.dataset.soundOn;
        video.play().catch(() => {
          const button = video.closest('.media-player')?.querySelector('.poster-play');
          if (button) button.hidden = false;
        });
      } else if (!video.paused) {
        video.dataset.autoPaused = '1';
        video.pause();
      }
    }), { threshold: 0.5 });
    videos.forEach(video => {
      observer.observe(video);
      video.addEventListener('pause', () => {
        if (video.dataset.autoPaused) delete video.dataset.autoPaused;
        else if (!video.ended) video.dataset.userPaused = '1';
      });
      video.addEventListener('play', () => { delete video.dataset.userPaused; });
    });
  }
  // Only one video plays with sound; the others stay muted.
  const soundButtons = [...document.querySelectorAll('.sound-toggle')];
  const refreshSound = () => soundButtons.forEach(b => {
    const video = document.getElementById(b.dataset.video);
    b.textContent = video && !video.muted ? '🔊 Sound off' : '🔈 Sound on';
  });
  soundButtons.forEach(b => {
    b.hidden = false;
    b.addEventListener('click', () => {
      const video = document.getElementById(b.dataset.video);
      if (!video) return;
      const turnOn = video.muted;
      videos.forEach(other => { if (other !== video) other.muted = true; });
      video.muted = !turnOn;
      if (turnOn) {
        video.dataset.soundOn = '1';
        if (video.ended) video.currentTime = 0;
        video.play().catch(() => {});
      } else delete video.dataset.soundOn;
      refreshSound();
    });
  });
  videos.forEach(video => video.addEventListener('volumechange', () => {
    if (!video.muted) videos.forEach(other => { if (other !== video) other.muted = true; });
    refreshSound();
  }));
  document.querySelectorAll('[data-seek]').forEach(button => {
    button.addEventListener('click', () => {
      const video = document.getElementById(button.dataset.video);
      if (!video) return;
      const seek = () => {
        video.currentTime = Number(button.dataset.seek);
        video.play().catch(() => {});
      };
      if (video.readyState >= 1) seek();
      else {
        video.addEventListener('loadedmetadata', seek, { once: true });
        video.load();
      }
    });
  });
  // Active chapter, a readable headline for small screens, and an end card.
  videos.forEach(video => {
    const buttons = [...document.querySelectorAll(`[data-seek][data-video="${video.id}"]`)];
    const line = document.querySelector(`.now-playing[data-video="${video.id}"]`);
    const headlines = JSON.parse(video.dataset.headlines || '[]');
    const end = video.closest('.media-player')?.querySelector('.film-end');
    const update = () => {
      const t = video.currentTime;
      const started = t > 0 && !video.ended;
      let active = null;
      buttons.forEach(b => { if (Number(b.dataset.seek) <= t + 0.05) active = b; });
      buttons.forEach(b => {
        const on = started && b === active;
        b.classList.toggle('is-active', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      if (line) {
        let text = '';
        headlines.forEach(([start, title]) => { if (start <= t + 0.05) text = title; });
        line.textContent = started ? text : '';
      }
    };
    ['timeupdate', 'seeked', 'play', 'pause'].forEach(type => video.addEventListener(type, update));
    video.addEventListener('ended', () => { update(); if (end) end.hidden = false; });
    video.addEventListener('play', () => { if (end) end.hidden = true; });
    end?.querySelector('.film-replay')?.addEventListener('click', () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    });
  });
  document.querySelectorAll('details').forEach(detail => {
    detail.addEventListener('toggle', () => {
      if (!detail.open) detail.querySelectorAll('video').forEach(video => video.pause());
    });
  });
})();
