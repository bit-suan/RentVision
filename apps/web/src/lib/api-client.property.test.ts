import * as fc from 'fast-check';
import { extractPropertyListing } from './api-client';
import type { ExtractedPropertyListingDto } from '../../../../shared/contracts';

describe('AI Client Multilingual Property Tests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Property: extractPropertyListing sends untampered description, resolves locale header, and propagates multilingual contracts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'Spacious 2-bedroom apartment in Bole with generator.',
          'በቦሌ 3 መኝታ ቤት ያለው አፓርታማ በወር 60,000 ብር።',
          'Modern 2-bedroom condo በጎተራ፣ 35,000 ETB per month.',
          'ባለ 4 ክፍል የመኖሪያ ቤት በመገናኛ።'
        ),
        fc.constantFrom<'en' | 'am'>('en', 'am'),
        async (description, locale) => {
          let capturedUrl = '';
          let capturedOptions: RequestInit | undefined;

          const mockResponse: ExtractedPropertyListingDto = {
            property_type: 'apartment',
            bedrooms: 2,
            bathrooms: 1,
            monthly_rent: 45000,
            currency: 'ETB',
            security_deposit: 45000,
            deposit_months: 1,
            utilities_included: true,
            furnishing_status: 'unfurnished',
            neighborhood: 'Bole',
            city: 'Addis Ababa',
            amenities: ['water tank'],
            availability: 'immediate',
            title_suggestion: locale === 'am' ? 'በቦሌ 2 መኝታ ቤት ያለው አፓርታማ' : '2-Bedroom Apartment in Bole',
            raw_description: description,
            extraction_status: 'success',
            unextracted_or_missing_fields: [],
            confidence_notes: 'All fields verified.',
            detected_language: description.includes('በ') ? (description.includes('Modern') ? 'mixed' : 'am') : 'en',
            requested_locale: locale,
            ambiguities: [],
          };

          global.fetch = jest.fn().mockImplementation(async (url: string, init?: RequestInit) => {
            capturedUrl = url;
            capturedOptions = init;
            return {
              ok: true,
              status: 200,
              json: async () => mockResponse,
              text: async () => JSON.stringify(mockResponse),
            } as Response;
          });

          const result = await extractPropertyListing(
            { description, locale },
            { locale }
          );

          expect(capturedUrl).toContain('/api/v1/extract-listing');
          expect(capturedOptions?.method).toBe('POST');
          const headers = capturedOptions?.headers as Record<string, string>;
          expect(headers['Content-Type']).toBe('application/json');
          expect(headers['Accept-Language']).toBe(locale);

          const sentBody = JSON.parse(capturedOptions?.body as string);
          // Original description must be preserved without mutation
          expect(sentBody.description).toBe(description);
          expect(sentBody.locale).toBe(locale);

          // Returned response matches contract
          expect(result.raw_description).toBe(description);
          expect(result.requested_locale).toBe(locale);
          expect(result.detected_language).toBeDefined();
          expect(['en', 'am', 'mixed']).toContain(result.detected_language);
        }
      ),
      { numRuns: 20 }
    );
  });
});
