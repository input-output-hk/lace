/* eslint-disable no-magic-numbers */
import React, { useEffect, useRef, useState } from 'react';
import { ListRange, VirtuosoGrid, VirtuosoGridProps } from 'react-virtuoso';
import cn from 'classnames';
import styles from './VirtualisedGrid.module.scss';

export const fixedVirtualisedGridColumns = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type VirtualisedGridColumns = (typeof fixedVirtualisedGridColumns)[number];

export const getTypedColumn = (column: number): VirtualisedGridColumns | undefined =>
  fixedVirtualisedGridColumns.find((c) => c === column);

export type GridProps<T> = VirtuosoGridProps<T, null> & {
  items: T[];
  loadMoreData?: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: T) => React.ReactElement;
  numberOfItemsPerRow?: number;
  scrollableTargetId?: string;
  testId?: string;
  tableReference?: React.Ref<HTMLDivElement>;
  columns?: VirtualisedGridColumns;
};

/**
 * Hook that waits for an element matching the query selector to appear in the DOM,
 * assigns it to the provided ref and triggers a re-render.
 *
 * @param selector - The CSS selector to match the element.
 */
const useQuerySelectorRef = <T extends HTMLElement>(
  selector: string
): [React.MutableRefObject<T | undefined>, boolean] => {
  const ref = useRef<T | undefined>();
  const [found, setFound] = useState(false); // State to trigger re-renders

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const element = document.querySelector<T>(selector);
      if (element) {
        ref.current = element;
        setFound(true); // Update state to trigger a re-render
        observer.disconnect(); // Stop observing once the element is found
      }
    });

    // Start observing the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup function to disconnect the observer
    return () => {
      observer.disconnect();
    };
  }, [selector]);

  return [ref, found];
};

export const VirtualisedGrid = <T extends Record<string, unknown> | undefined>({
  itemContent,
  items,
  loadMoreData,
  scrollableTargetId = '',
  tableReference,
  testId,
  columns,
  ...props
}: GridProps<T>): React.ReactElement => {
  const [scrollableTargetReference] = useQuerySelectorRef(`#${scrollableTargetId}`);

  return (
    <div ref={tableReference} data-testid={testId}>
      <VirtuosoGrid<T>
        listClassName={cn(styles.grid, { [styles[`grid-${columns}`]]: columns })}
        data={items}
        customScrollParent={scrollableTargetReference.current}
        totalCount={items.length}
        className={styles.body}
        rangeChanged={loadMoreData}
        itemContent={itemContent}
        {...props}
      />
    </div>
  );
};
