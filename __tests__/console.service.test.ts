import { ConsoleService } from '../src/services/console.service';

describe('Console Service', () => {
  let consoleService: ConsoleService;
  beforeAll(() => {
    consoleService = new ConsoleService();
  });

  describe('#getParameters', () => {
    it('should get valid parameters', () => {
      const argvs = [
        '/usr/bin/ts-node',
        '/blablabla inexistent parameters',
        '-h',
        '--root',
        '/sample/path',
        '-D',
        'lala',
        'random text',
        '-f',
      ];

      const result = consoleService.getParameters(argvs);

      expect(result['help']).not.toBeFalsy();
      expect(result['root']).toBe('/sample/path');
      expect(result['delete-all']).not.toBeFalsy();
      expect(result['lala']).toBeUndefined();
      expect(result['inexistent']).toBeUndefined();
      expect(result['full-scan']).not.toBeFalsy();
    });
    /*it('should get valid parameters 2', () => {
      const argvs = [
        '/usr/bin/ts-node',
        '/blablabla inexistent parameters',
        '-f',
        'lala',
      ];

      const result = consoleService.getParameters(argvs);
      expect(result['help']).toBeFalsy();
      expect(result['full']).not.toBeFalsy();
    });*/
  });

  describe('#splitStringIntoArrayByCharactersWidth', () => {
    it('should get array with text according to width', () => {
      const cases = [
        {
          text:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris faucibus sit amet libero non vestibulum. Morbi ac tellus dolor. Duis consectetur eget lectus sed ullamcorper.',
          width: 43,
          expect: [
            'Lorem ipsum dolor sit amet, consectetur',
            'adipiscing elit. Mauris faucibus sit amet',
            'libero non vestibulum. Morbi ac tellus',
            'dolor. Duis consectetur eget lectus sed',
            'ullamcorper.',
          ],
        },
        /* {
          text: 'Lorem ipsum dolor sit amet.',
          width: 2,
          expect: ['Lorem', 'ipsum', 'dolor', 'sit', 'amet.'],
        }, */
      ];

      cases.forEach(cas => {
        expect(
          consoleService.splitStringIntoArrayByCharactersWidth(
            cas.text,
            cas.width,
          ),
        ).toEqual(cas.expect);
      });
    });
  });

  describe('#shortenText', () => {
    it('should short text according parameters', () => {
      const cases = [
        {
          text: '/sample/text/for/test how/service/split/this',
          expect: '/sample/te.../service/split/this',
          width: 32,
          cutFrom: 10,
        },
        {
          text: '/aaa/bbb/ccc/ddd/eee/fff/ggg/hhhh/iiii/jjj/kkk',
          expect: '/aaa/.../jjj/kkk',
          width: 16,
          cutFrom: 5,
        },
        {
          text: '/neketaro/a:desktop/folder',
          expect: '/neketaro/a:desktop/folder',
          width: 50,
          cutFrom: 3,
        },
      ];

      cases.forEach(cas => {
        const result = consoleService.shortenText(
          cas.text,
          cas.width,
          cas.cutFrom,
        );
        expect(result).toEqual(cas.expect);
      });
    });

    it('should no modify input if "cutFrom" > text length', () => {
      const text = '/sample/text/';
      const expectResult = '/sample/text/';
      const width = 5;
      const cutFrom = 50;

      const result = consoleService.shortenText(text, width, cutFrom);
      expect(result).toEqual(expectResult);
    });

    it('should no modify input if "cutFrom" > width', () => {
      const text = '/sample/text/';
      const expectResult = '/sample/text/';
      const width = 5;
      const cutFrom = 7;

      const result = consoleService.shortenText(text, width, cutFrom);
      expect(result).toEqual(expectResult);
    });

    it('should ignore negative parameters', () => {
      const cases = [
        {
          text: '/sample/text/for/test how/service/split/thisA',
          expect: '/sample/text/for/test how/service/split/thisA',
          width: 5,
          cutFrom: -10,
        },
        {
          text: '/sample/text/for/test how/service/split/thisB',
          expect: '/sample/text/for/test how/service/split/thisB',
          width: -10,
          cutFrom: 10,
        },
        {
          text: '/sample/text/for/test how/service/split/thisC',
          expect: '/sample/text/for/test how/service/split/thisC',
          width: -10,
          cutFrom: -20,
        },
      ];

      cases.forEach(cas => {
        const result = consoleService.shortenText(
          cas.text,
          cas.width,
          cas.cutFrom,
        );
        expect(result).toEqual(cas.expect);
      });
    });
  });
});