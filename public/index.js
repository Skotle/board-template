fetch('/posts')
  .then(res => res.json())
  .then(posts => {
    const list = document.getElementById('postList');
    posts.reverse().forEach(post => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `post.html?id=${post.id}`;
      link.textContent = `[${post.author}] ${post.title}`;
      li.appendChild(link);
      list.appendChild(li);
    });
  });
