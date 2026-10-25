// Swaps the homepage social grid's built-in photos for the latest Instagram posts
// served by /api/social-feed. Falls back silently to the built-in photos.
(function () {
    'use strict';

    var grid = document.querySelector('[data-social-feed]');
    if (!grid || typeof fetch !== 'function') return;

    function render(posts) {
        var tiles = grid.querySelectorAll('a');
        var count = Math.min(tiles.length, posts.length);
        for (var i = 0; i < count; i++) {
            var post = posts[i];
            var tile = tiles[i];
            var img = tile.querySelector('img');
            var source = tile.querySelector('source');
            if (!img) continue;
            if (source) source.remove();
            img.removeAttribute('srcset');
            img.src = post.image;
            img.alt = post.caption ? 'Instagram: ' + post.caption : 'Time Mission Instagram post';
            tile.href = post.link;
        }
    }

    fetch('/api/social-feed', { headers: { accept: 'application/json' } })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
            if (data && Array.isArray(data.posts) && data.posts.length) render(data.posts);
        })
        .catch(function () { /* keep built-in photos */ });
})();
