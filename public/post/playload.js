function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]; // payload 부분
    const base64 = atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'));
    const jsonPayload = decodeURIComponent(
      [...base64].map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    return JSON.parse(jsonPayload); // JSON 객체로 반환
  } catch (e) {
    return {};
  }
}