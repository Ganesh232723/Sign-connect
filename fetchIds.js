fetch('https://www.youtube.com/results?search_query=indian+sign+language+tutorial')
  .then(res => res.text())
  .then(text => {
    const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const matches = [...text.matchAll(regex)];
    const uniqueIds = [...new Set(matches.map(m => m[1]))].slice(0, 10);
    console.log(uniqueIds);
  });
