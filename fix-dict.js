const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

function fix(str) {
    const replacements = {
        'Khá»Ÿi táº¡o': 'Khởi tạo', 'vá»›i Ä‘a táº§ng': 'với đa tầng',
        'Táº§ng': 'Tầng', 'Æ¯u tiÃªn': 'Ưu tiên', 'chia sáº»': 'chia sẻ',
        'náº¿u cáº§n': 'nếu cần', 'Cáº¥u hÃ¬nh': 'Cấu hình', 'Quan trá» ng:': 'Quan trọng:',
        'Cho phÃ©p': 'Cho phép', 'vÃ o': 'vào', 'nghiá»‡p vá»¥': 'nghiệp vụ',
        'Ä‘á»ƒ': 'để', 'Ä‘Æ°á»£c': 'được', 'suy tÆ°': 'suy tư', 'xá»­ lÃ½': 'xử lý',
        'tÃ­nh toÃ¡n': 'tính toán', 'láº¡i': 'lại', 'káº¿t quáº£': 'kết quả',
        'cá»§a': 'của', 'cÃ¢u lá»‡nh': 'câu lệnh', 'toÃ n bá»™': 'toàn bộ',
        'dá»±a trÃªn': 'dựa trên', 'TrÃ¬nh diá»…n': 'Trình diễn', 'khÃ¡c nhau': 'khác nhau',
        'thá»±c thi': 'thực thi', 'tÃ¹y chá» n': 'tùy chọn', 'kiá»ƒm tra': 'kiểm tra',
        'trÆ°á»›c khi': 'trước khi', 'náº·ng': 'nặng', 'Háº£i sáº£n': 'Hải sản',
        'cá»±c pháº©m': 'cực phẩm', 'LÆ°u': 'Lưu', 'dÃ¹ng cho láº§n sau': 'dùng cho lần sau',
        'thÆ°á» ng': 'thường', 'chá»‰ tráº£ vá» ': 'chỉ trả về', 'thÃ´': 'thô',
        'mÃ´ phá» ng': 'mô phỏng', 'tÃ¡c vá»¥': 'tác vụ', 'giÃ¢y': 'giây',
        'XÃ³a': 'Xóa', 'thá»­': 'thử', 'luá»“ng': 'luồng', 'dá»¯ liá»‡u': 'dữ liệu',
        'táº­p': 'tập', 'lá»›n': 'lớn', 'Thá»±c thá»ƒ': 'Thực thể', 'minh há» a': 'minh họa',
        'Sá»­ dá»¥ng': 'Sử dụng', 'Ä áº·t': 'Đặt', 'thá» i gian': 'thời gian',
        'Ä o': 'Đo', 'Ä‘Ã£ cÃ³': 'đã có', 'chÆ°a': 'chưa', 'Giáº£ láº­p': 'Giả lập',
        'Ä Äƒng kÃ½': 'Đăng ký', 'chá»§ Ä‘á»™ng': 'chủ động', 'tá»± Ä‘á»™ng': 'tự động',
        'Ä‘á»“ chÆ¡i': 'đồ chơi', 'ngÆ°á» i chá»§': 'người chủ', 'Ä‘º¡i diá»‡n': 'đại diện',
        'Nhiá» u': 'Nhiều', 'khÃ³a ngoáº¡i': 'khóa ngoại', 'thá»ƒ': 'thể',
        'cÃ¹ng má»™t': 'cùng một', 'duy nháº¥t má»™t': 'duy nhất một', 'há»™ chiáº¿u': 'hộ chiếu',
        'Sá»‘ hiá»‡u': 'Số hiệu', 'ngÆ°á»£c láº¡i': 'ngược lại', 'Ä‘áº§y Ä‘á»§': 'đầy đủ',
        'loáº¡i quan há»‡': 'loại quan hệ', 'sá»Ÿ há»¯u': 'sở hữu', 'tá»± tÄƒng': 'tự tăng',
        'TÃªn': 'Tên', 'Ã¢â‚¬â€': '—', 'Ä‘º¡i': 'đại'
    };
    let changed = false;
    Object.keys(replacements).forEach(k => {
        if (str.includes(k)) {
            str = str.split(k).join(replacements[k]);
            changed = true;
        }
    });
    return { str, changed };
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        file = path.join(dir, file);
        if (fs.statSync(file).isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) walk(file);
        } else if (file.endsWith('.ts')) {
            let c = fs.readFileSync(file, 'utf8');
            let result = fix(c);
            if (result.changed) {
                fs.writeFileSync(file, result.str, 'utf8');
                console.log('Fixed', file);
            }
        }
    });
}
walk('.');
