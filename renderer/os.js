// Lets each page adjust for Mac or Windows (e.g. room for the Mac window buttons).
document.documentElement.dataset.os = (window.pet && window.pet.platform) || 'darwin';
