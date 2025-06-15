// Component tests for debate listing functionality
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebatesPage from '@/app/debates/page';
import { mockSearchResults } from '../fixtures/mock-debates';

// Mock the DebateAPI
jest.mock('@/lib/utils/debate-conversion', () => ({
  DebateAPI: {
    searchDebates: jest.fn(),
  }
}));

import { DebateAPI } from '@/lib/utils/debate-conversion';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null)
  })
}));

describe('DebatesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should render debates list', async () => {
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(mockSearchResults);
    
    render(<DebatesPage />);
    
    // Check if loading state appears first
    expect(screen.getByText('Loading debates...')).toBeInTheDocument();
    
    // Wait for debates to load
    await waitFor(() => {
      expect(screen.getByText('📚 Debate Archive')).toBeInTheDocument();
    });
    
    // Check if debates are displayed
    expect(screen.getByText('Climate Change Policy')).toBeInTheDocument();
    expect(screen.getByText('Universal Basic Income')).toBeInTheDocument();
  });
  
  test('should display debate metadata correctly', async () => {
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(mockSearchResults);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Climate Change Policy')).toBeInTheDocument();
    });
    
    // Check debate details
    expect(screen.getByText('Debate on effective climate policies')).toBeInTheDocument();
    expect(screen.getByText(/arguments/)).toBeInTheDocument();
    expect(screen.getByText(/participants/)).toBeInTheDocument();
    
    // Check status badges
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    
    // Check tags
    expect(screen.getByText('#climate')).toBeInTheDocument();
    expect(screen.getByText('#economics')).toBeInTheDocument();
  });
  
  test('should handle search functionality', async () => {
    const user = userEvent.setup();
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(mockSearchResults);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by topic, content, or participant...')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search by topic, content, or participant...');
    const searchButton = screen.getByText('🔍 Search');
    
    // Type in search input
    await user.type(searchInput, 'climate');
    
    // Click search button
    await user.click(searchButton);
    
    // Verify search was called with correct parameters
    await waitFor(() => {
      expect(DebateAPI.searchDebates).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'climate'
        })
      );
    });
  });
  
  test('should handle status filter', async () => {
    const user = userEvent.setup();
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(mockSearchResults);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    });
    
    const statusSelect = screen.getByDisplayValue('All Status');
    
    // Change status filter
    await user.selectOptions(statusSelect, 'active');
    
    // Verify API was called with status filter
    await waitFor(() => {
      expect(DebateAPI.searchDebates).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active'
        })
      );
    });
  });
  
  test('should handle sort options', async () => {
    const user = userEvent.setup();
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(mockSearchResults);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Created Date')).toBeInTheDocument();
    });
    
    const sortSelect = screen.getByDisplayValue('Created Date');
    const orderSelect = screen.getByDisplayValue('Newest First');
    
    // Change sort options
    await user.selectOptions(sortSelect, 'modified');
    await user.selectOptions(orderSelect, 'asc');
    
    // Verify API was called with sort options
    await waitFor(() => {
      expect(DebateAPI.searchDebates).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'modified',
          sortOrder: 'asc'
        })
      );
    });
  });
  
  test('should navigate to debate when clicking open button', async () => {
    const user = userEvent.setup();
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(mockSearchResults);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('🔗 Open')[0]).toBeInTheDocument();
    });
    
    const openButton = screen.getAllByText('🔗 Open')[0];
    await user.click(openButton);
    
    // Verify navigation
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/debate/session?debateId=')
    );
  });
  
  test('should navigate to preview when clicking preview button', async () => {
    const user = userEvent.setup();
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(mockSearchResults);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('👁️ Preview')[0]).toBeInTheDocument();
    });
    
    const previewButton = screen.getAllByText('👁️ Preview')[0];
    await user.click(previewButton);
    
    // Verify navigation
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/debate/preview?debateId=')
    );
  });
  
  test('should handle loading state', async () => {
    // Mock a delayed response
    (DebateAPI.searchDebates as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockSearchResults), 100))
    );
    
    render(<DebatesPage />);
    
    // Check loading state
    expect(screen.getByText('Loading debates...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading debates...')).not.toBeInTheDocument();
    });
  });
  
  test('should handle error state', async () => {
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(null);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading debates')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to load debates')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
  
  test('should handle retry functionality', async () => {
    const user = userEvent.setup();
    
    // First call fails
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValueOnce(null);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
    
    // Second call succeeds
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValueOnce(mockSearchResults);
    
    const retryButton = screen.getByText('Try Again');
    await user.click(retryButton);
    
    // Verify retry worked
    await waitFor(() => {
      expect(screen.getByText('Climate Change Policy')).toBeInTheDocument();
    });
  });
  
  test('should handle empty state', async () => {
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue([]);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No debates found')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Get started by creating your first debate.')).toBeInTheDocument();
    expect(screen.getByText('➕ Create Your First Debate')).toBeInTheDocument();
  });
  
  test('should handle search with no results', async () => {
    const user = userEvent.setup();
    
    // Initial load with results
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValueOnce(mockSearchResults);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Climate Change Policy')).toBeInTheDocument();
    });
    
    // Search with no results
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValueOnce([]);
    
    const searchInput = screen.getByPlaceholderText('Search by topic, content, or participant...');
    await user.type(searchInput, 'nonexistent topic');
    
    const searchButton = screen.getByText('🔍 Search');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('No debates found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria.')).toBeInTheDocument();
    });
  });
  
  test('should format dates correctly', async () => {
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(mockSearchResults);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Climate Change Policy')).toBeInTheDocument();
    });
    
    // Check if dates are formatted (should contain "Created:")
    expect(screen.getAllByText(/Created:/)[0]).toBeInTheDocument();
  });
  
  test('should handle pagination (when implemented)', async () => {
    // Note: Current implementation doesn't have working pagination
    // This test is for future pagination functionality
    (DebateAPI.searchDebates as jest.Mock).mockResolvedValue(mockSearchResults);
    
    render(<DebatesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Climate Change Policy')).toBeInTheDocument();
    });
    
    // Currently no pagination controls should be visible for small result sets
    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });
});