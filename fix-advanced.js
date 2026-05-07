const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

function fix(str) {
    // Regex matches words starting with or containing Latin-1 supplement characters
    // commonly found in win1252 mapped UTF-8 (like Ã, Ä, Æ, etc.) followed by extended characters.
    const regex = /[a-zA-Z]*[\xC0-\xD6\xD8-\xF6\xF8-\xFF][\x80-\xFF\w\u0152-\u017E\u2013-\u20AC]*/g;
    
    let changed = false;
    let newStr = str.replace(regex, m => {
        const decoded = iconv.decode(iconv.encode(m, 'win1252'), 'utf8');
        // Only replace if the decoding seems valid (doesn't have replacement character  and actually changed)
        if (decoded !== m && !decoded.includes('\uFFFD')) {
            changed = true;
            return decoded;
        }
        return m;
    });
    return { str: newStr, changed };
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        file = path.join(dir, file);
        if (fs.statSync(file).isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) walk(file);
        } else if (file.endsWith('.ts') || file.endsWith('.md')) {
            let c = fs.readFileSync(file, 'utf8');
            let res = fix(c);
            if (res.changed) {
                fs.writeFileSync(file, res.str, 'utf8');
                console.log('Fixed mojibake in', file);
            }
        }
    });
}
walk('c:\\Repositories\\ac\\starci-academy-backend\\.repo\\fullstack-mastery-module-2-database-integration-orm-odm-caching');
walk('c:\\Repositories\\ac\\starci-academy-backend\\.repo\\fullstack.mastery.module1.backend-environment-nestjs-introduction');
