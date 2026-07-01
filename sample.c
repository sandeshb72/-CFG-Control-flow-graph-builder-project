int main() {
    // 1. Constant Folding & Propagation
    int x = 10 + 20; 
    int y = x * 2;   // x becomes 30, y becomes 60

    // 2. Dead Code Elimination (DCE)
    int unused_var = y + 5; // This will be REMOVED

    // 3. Logic Branching 
    int choice;
    if (y > 50) {
        choice = 1;
    } else {
        choice = 0;
    }

    // 4. Loop Invariant Code Motion (LICM)
    int i = 0;
    int invariant_calc;
    while (i < 10) {
        // 'y * 10' never changes. 
        // LICM will hoist this out of the loop!
        invariant_calc = y * 10; 
        i = i + 1;
    }

    // 5. Unreachable Code Removal
    if (0) {
        int unreachable = 999;
    }

    return choice + invariant_calc;
}



int main() {
    int a = 10;
    int b = 20;
    int x = a + b; // 1. Folding: x becomes 30
    
    int i = 0;
    int total = 0;

    // 2. Nested Loops (Showcases Dominator Analysis)
    while (i < 5) {
        int j = 0;
        
        // 3. Nested LICM: This will be hoisted out of the INNER loop
        // but stay inside the OUTER loop.
        int inner_invariant = x * 2; 
        
        while (j < 5) {
            total = total + inner_invariant;
            j = j + 1;
        }
        i = i + 1;
    }

    // 4. Advanced Dead Code: 
    // This is mathematically complex but the result is unused.
    int complex_dead = (total * 0) + (a * b); 

    // 5. Memory Safety (Bug Fix)
    int log[1];
    log[0] = total; // Must NOT be removed

    // 6. Conditional Pruning
    if (x > 100) { // x is 30, so this is ALWAYS false
        printf("This logic is unreachable");
    }

    return total;
}

