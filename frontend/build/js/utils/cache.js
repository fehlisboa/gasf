// Utilitário de cache com expiração para localStorage
// Uso: cache.set('chave', valor, minutosExpiracao)
//      cache.get('chave')
//      cache.remove('chave')

const cache = {
    set: function(key, value, expireMinutes = 2) {
        const expires = Date.now() + expireMinutes * 60 * 1000;
        const data = { value, expires };
        localStorage.setItem(key, JSON.stringify(data));
    },
    get: function(key) {
        const data = localStorage.getItem(key);
        if (!data) return null;
        try {
            const parsed = JSON.parse(data);
            if (parsed.expires && Date.now() < parsed.expires) {
                return parsed.value;
            } else {
                localStorage.removeItem(key);
                return null;
            }
        } catch {
            localStorage.removeItem(key);
            return null;
        }
    },
    remove: function(key) {
        localStorage.removeItem(key);
    }
};

window.cache = cache; 