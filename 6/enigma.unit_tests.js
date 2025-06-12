const { 
  Enigma, 
  Rotor, 
  ROTORS, 
  REFLECTOR, 
  alphabet, 
  mod, 
  plugboardSwap 
} = require('../src/enigma');

describe('Utility functions', () => {
  test('mod function handles negative numbers correctly', () => {
    expect(mod(-1, 26)).toBe(25);
    expect(mod(-27, 26)).toBe(25);
    expect(mod(27, 26)).toBe(1);
    expect(mod(0, 26)).toBe(0);
  });

  test('plugboardSwap works correctly', () => {
    const pairs = [['A', 'B'], ['C', 'D']];
    expect(plugboardSwap('A', pairs)).toBe('B');
    expect(plugboardSwap('B', pairs)).toBe('A');
    expect(plugboardSwap('C', pairs)).toBe('D');
    expect(plugboardSwap('D', pairs)).toBe('C');
    expect(plugboardSwap('E', pairs)).toBe('E');
  });

  test('plugboardSwap with empty pairs', () => {
    expect(plugboardSwap('A', [])).toBe('A');
  });
});

describe('Rotor class', () => {
  let rotor;

  beforeEach(() => {
    rotor = new Rotor(ROTORS[0].wiring, ROTORS[0].notch, 0, 0);
  });

  test('constructor initializes correctly', () => {
    expect(rotor.wiring).toBe(ROTORS[0].wiring);
    expect(rotor.notch).toBe(ROTORS[0].notch);
    expect(rotor.ringSetting).toBe(0);
    expect(rotor.position).toBe(0);
  });

  test('step increments position correctly', () => {
    rotor.step();
    expect(rotor.position).toBe(1);
    
    rotor.position = 25;
    rotor.step();
    expect(rotor.position).toBe(0);
  });

  test('atNotch detects notch correctly', () => {
    // Rotor I notch is at Q (position 16)
    rotor.position = 16;
    expect(rotor.atNotch()).toBe(true);
    
    rotor.position = 15;
    expect(rotor.atNotch()).toBe(false);
  });

  test('forward encoding works', () => {
    const result = rotor.forward('A');
    expect(result).toBe('E'); // First character of Rotor I wiring
  });

  test('backward encoding works', () => {
    const result = rotor.backward('E');
    expect(result).toBe('A');
  });

  test('rotor with ring setting and position', () => {
    const rotorWithSettings = new Rotor(ROTORS[0].wiring, ROTORS[0].notch, 1, 2);
    expect(rotorWithSettings.ringSetting).toBe(1);
    expect(rotorWithSettings.position).toBe(2);
  });
});

describe('Enigma class', () => {
  let enigma;

  beforeEach(() => {
    enigma = new Enigma([0, 1, 2], [0, 0, 0], [0, 0, 0], []);
  });

  test('constructor initializes rotors correctly', () => {
    expect(enigma.rotors).toHaveLength(3);
    expect(enigma.rotors[0]).toBeInstanceOf(Rotor);
    expect(enigma.plugboardPairs).toEqual([]);
  });

  test('stepRotors - basic stepping', () => {
    const initialPositions = [0, 0, 0];
    enigma.stepRotors();
    expect(enigma.rotors[2].position).toBe(1); // Right rotor steps
    expect(enigma.rotors[1].position).toBe(0); // Middle rotor doesn't step
    expect(enigma.rotors[0].position).toBe(0); // Left rotor doesn't step
  });

  test('stepRotors - middle rotor steps when right rotor at notch', () => {
    // Set right rotor (Rotor III) to notch position V (21)
    enigma.rotors[2].position = 21;
    enigma.stepRotors();
    expect(enigma.rotors[2].position).toBe(22); // Right rotor steps
    expect(enigma.rotors[1].position).toBe(1);  // Middle rotor steps
    expect(enigma.rotors[0].position).toBe(0);  // Left rotor doesn't step
  });

  test('stepRotors - double stepping when middle rotor at notch', () => {
    // Set middle rotor (Rotor II) to notch position E (4)
    enigma.rotors[1].position = 4;
    enigma.stepRotors();
    expect(enigma.rotors[2].position).toBe(1); // Right rotor steps
    expect(enigma.rotors[1].position).toBe(6); // Middle rotor steps twice (double-step)
    expect(enigma.rotors[0].position).toBe(1); // Left rotor steps
  });

  test('stepRotors - double stepping with right rotor also at notch', () => {
    // Both middle and right rotors at notch
    enigma.rotors[1].position = 4; // Middle rotor at notch E
    enigma.rotors[2].position = 21; // Right rotor at notch V
    enigma.stepRotors();
    expect(enigma.rotors[2].position).toBe(22); // Right rotor steps
    expect(enigma.rotors[1].position).toBe(6);  // Middle rotor steps twice
    expect(enigma.rotors[0].position).toBe(1);  // Left rotor steps
  });

  test('encryptChar handles non-alphabetic characters', () => {
    const result = enigma.encryptChar('1');
    expect(result).toBe('1');
    
    const result2 = enigma.encryptChar(' ');
    expect(result2).toBe(' ');
  });

  test('basic encryption/decryption symmetry', () => {
    const message = 'HELLO';
    const encrypted = enigma.process(message);
    
    // Reset enigma to same initial state
    const enigma2 = new Enigma([0, 1, 2], [0, 0, 0], [0, 0, 0], []);
    const decrypted = enigma2.process(encrypted);
    
    expect(decrypted).toBe(message);
  });

  test('different initial rotor positions', () => {
    const enigma1 = new Enigma([0, 1, 2], [0, 0, 0], [0, 0, 0], []);
    const enigma2 = new Enigma([0, 1, 2], [1, 2, 3], [0, 0, 0], []);
    
    const message = 'TEST';
    const result1 = enigma1.process(message);
    const result2 = enigma2.process(message);
    
    expect(result1).not.toBe(result2);
  });

  test('different ring settings', () => {
    const enigma1 = new Enigma([0, 1, 2], [0, 0, 0], [0, 0, 0], []);
    const enigma2 = new Enigma([0, 1, 2], [0, 0, 0], [1, 2, 3], []);
    
    const message = 'TEST';
    const result1 = enigma1.process(message);
    const result2 = enigma2.process(message);
    
    expect(result1).not.toBe(result2);
  });

  test('plugboard functionality', () => {
    const enigmaWithPlugs = new Enigma([0, 1, 2], [0, 0, 0], [0, 0, 0], [['A', 'B']]);
    const enigmaWithoutPlugs = new Enigma([0, 1, 2], [0, 0, 0], [0, 0, 0], []);
    
    const message = 'A';
    const resultWith = enigmaWithPlugs.process(message);
    const resultWithout = enigmaWithoutPlugs.process(message);
    
    expect(resultWith).not.toBe(resultWithout);
  });

  test('plugboard encryption/decryption symmetry', () => {
    const plugs = [['A', 'B'], ['C', 'D'], ['E', 'F']];
    const message = 'ABCDEF';
    
    const enigma1 = new Enigma([0, 1, 2], [5, 10, 15], [0, 0, 0], plugs);
    const encrypted = enigma1.process(message);
    
    const enigma2 = new Enigma([0, 1, 2], [5, 10, 15], [0, 0, 0], plugs);
    const decrypted = enigma2.process(encrypted);
    
    expect(decrypted).toBe(message);
  });

  test('multiple plugboard pairs', () => {
    const plugs = [['A', 'Z'], ['B', 'Y'], ['C', 'X']];
    const enigmaWithPlugs = new Enigma([0, 1, 2], [0, 0, 0], [0, 0, 0], plugs);
    
    // Test that all plugged letters are affected
    const message = 'ABC';
    const result = enigmaWithPlugs.process(message);
    
    // The result should be different because of plugboard swapping
    const enigmaWithoutPlugs = new Enigma([0, 1, 2], [0, 0, 0], [0, 0, 0], []);
    const resultWithoutPlugs = enigmaWithoutPlugs.process(message);
    
    expect(result).not.toBe(resultWithoutPlugs);
  });

  test('process converts to uppercase', () => {
    const message = 'hello world';
    const result = enigma.process(message);
    
    expect(result).toMatch(/^[A-Z ]+$/);
    expect(result).toContain(' '); // Space should be preserved
  });

  test('long message encryption/decryption', () => {
    const message = 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG';
    const enigma1 = new Enigma([0, 1, 2], [12, 5, 18], [3, 7, 11], [['A', 'M'], ['T', 'K']]);
    const encrypted = enigma1.process(message);
    
    const enigma2 = new Enigma([0, 1, 2], [12, 5, 18], [3, 7, 11], [['A', 'M'], ['T', 'K']]);
    const decrypted = enigma2.process(encrypted);
    
    expect(decrypted).toBe(message);
  });

  test('rotor overflow positions', () => {
    // Test with positions at boundaries
    const enigma1 = new Enigma([0, 1, 2], [25, 25, 25], [0, 0, 0], []);
    const message = 'TEST';
    const result = enigma1.process(message);
    
    expect(typeof result).toBe('string');
    expect(result.length).toBe(message.length);
  });

  test('edge case: empty message', () => {
    const result = enigma.process('');
    expect(result).toBe('');
  });

  test('edge case: special characters preservation', () => {
    const message = 'HELLO, WORLD! 123';
    const result = enigma.process(message);
    
    expect(result).toContain(',');
    expect(result).toContain('!');
    expect(result).toContain('1');
    expect(result).toContain('2');
    expect(result).toContain('3');
    expect(result).toContain(' ');
  });
});

describe('Historical accuracy tests', () => {
  test('rotor specifications match historical data', () => {
    expect(ROTORS[0].wiring).toBe('EKMFLGDQVZNTOWYHXUSPAIBRCJ');
    expect(ROTORS[0].notch).toBe('Q');
    expect(ROTORS[1].notch).toBe('E');
    expect(ROTORS[2].notch).toBe('V');
  });

  test('reflector specification', () => {
    expect(REFLECTOR).toBe('YRUHQSLDPXNGOKMIEBFZCWVJAT');
    expect(REFLECTOR.length).toBe(26);
  });

  test('alphabet constant', () => {
    expect(alphabet).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(alphabet.length).toBe(26);
  });
}); 
