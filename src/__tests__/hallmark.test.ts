import { describe, it, expect } from 'vitest';
import { runHallmarkAudit } from '../lib/hallmark';

describe('Hallmark Audit', () => {
  it('should flag AI buzzwords', () => {
    const result = runHallmarkAudit([
      { id: '1', title: 'Test', content: 'Furthermore, it is worth noting that this is a tapestry of information.' }
    ]);
    
    expect(result.status).toBe('flagged');
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.flags.some(f => f.matchedText === 'furthermore')).toBe(true);
  });

  it('should pass natural text', () => {
    const result = runHallmarkAudit([
      { id: '1', title: 'Test', content: 'The analysis showed a significant increase in the primary metric, confirming the initial hypothesis that the intervention was successful. We observed a 15% reduction in error rates.' }
    ]);
    
    expect(result.status).toBe('pristine');
    expect(result.flags.length).toBe(0);
  });
});
