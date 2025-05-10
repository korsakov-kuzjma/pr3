self.onmessage = function(e) {
    const max = e.data;
    const primes = [];
    
    for (let i = 2; i <= max; i++) {
        let isPrime = true;
        for (let j = 2; j <= Math.sqrt(i); j++) {
            if (i % j === 0) {
                isPrime = false;
                break;
            }
        }
        if (isPrime) primes.push(i);
    }
    
    self.postMessage(primes.length);
};