export type LeetCodeQuestion = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  acceptance: string;
  category: "Array" | "String" | "Hash Table" | "Dynamic Programming" | "Binary Search" | "Stack" | "Math";
  description: string;
  starterCode: {
    python: string;
    javascript: string;
    cpp: string;
  };
  testRunner: {
    python: string;
    javascript: string;
    cpp: string;
  };
};

export const LEETCODE_QUESTIONS: LeetCodeQuestion[] = [
  {
    id: "1",
    title: "Two Sum",
    difficulty: "easy",
    acceptance: "57.5%",
    category: "Array",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have ***exactly* one solution**, and you may not use the *same* element twice.

You can return the answer in any order.

### Example 1:
\`\`\`text
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

### Example 2:
\`\`\`text
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

### Example 3:
\`\`\`text
Input: nums = [3,3], target = 6
Output: [0,1]
\`\`\`

### Constraints:
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- **Only one valid answer exists.**`,
    starterCode: {
      python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Write your code here
        pass
`,
      javascript: `class Solution {
    twoSum(nums, target) {
        // Write your code here
        
    }
}
`,
      cpp: `#include <vector>

class Solution {
public:
    std::vector<int> twoSum(std::vector<int>& nums, int target) {
        // Write your code here
        
    }
};
`
    },
    testRunner: {
      python: `
# Test runner assertions
try:
    sol = Solution()
    
    r1 = sol.twoSum([2, 7, 11, 15], 9)
    if sorted(r1) != [0, 1]:
        raise ValueError(f"Expected [0, 1] for nums=[2,7,11,15] target=9, got {r1}")
        
    r2 = sol.twoSum([3, 2, 4], 6)
    if sorted(r2) != [1, 2]:
        raise ValueError(f"Expected [1, 2] for nums=[3,2,4] target=6, got {r2}")
        
    r3 = sol.twoSum([3, 3], 6)
    if sorted(r3) != [0, 1]:
        raise ValueError(f"Expected [0, 1] for nums=[3,3] target=6, got {r3}")
        
    print("__SUCCESS__")
except Exception as e:
    print(f"__FAILED__: {str(e)}")
`,
      javascript: `
// Test runner assertions
try {
    const sol = new Solution();
    
    const r1 = sol.twoSum([2, 7, 11, 15], 9);
    if (!r1 || r1.length !== 2 || r1.sort().toString() !== "0,1") {
        throw new Error("Expected [0, 1] for nums=[2,7,11,15] target=9, got " + JSON.stringify(r1));
    }
    
    const r2 = sol.twoSum([3, 2, 4], 6);
    if (!r2 || r2.length !== 2 || r2.sort().toString() !== "1,2") {
        throw new Error("Expected [1, 2] for nums=[3,2,4] target=6, got " + JSON.stringify(r2));
    }
    
    console.log("__SUCCESS__");
} catch(e) {
    console.log("__FAILED__: " + e.message);
}
`,
      cpp: `
#include <iostream>
#include <algorithm>

int main() {
    Solution sol;
    
    std::vector<int> n1 = {2, 7, 11, 15};
    std::vector<int> r1 = sol.twoSum(n1, 9);
    std::sort(r1.begin(), r1.end());
    if (r1.size() != 2 || r1[0] != 0 || r1[1] != 1) {
        std::cout << "__FAILED__: Expected [0, 1] for test case 1" << std::endl;
        return 0;
    }
    
    std::vector<int> n2 = {3, 2, 4};
    std::vector<int> r2 = sol.twoSum(n2, 6);
    std::sort(r2.begin(), r2.end());
    if (r2.size() != 2 || r2[0] != 1 || r2[1] != 2) {
        std::cout << "__FAILED__: Expected [1, 2] for test case 2" << std::endl;
        return 0;
    }
    
    std::cout << "__SUCCESS__" << std::endl;
    return 0;
}
`
    }
  },
  {
    id: "20",
    title: "Valid Parentheses",
    difficulty: "easy",
    acceptance: "43.8%",
    category: "Stack",
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example 1:
\`\`\`text
Input: s = "()"
Output: true
\`\`\`

### Example 2:
\`\`\`text
Input: s = "()[]{}"
Output: true
\`\`\`

### Example 3:
\`\`\`text
Input: s = "(]"
Output: false
\`\`\`

### Constraints:
- \`1 <= s.length <= 10^4\`
- \`s\` consists of parentheses characters only: \`()[]{}\`.`,
    starterCode: {
      python: `class Solution:
    def isValid(self, s: str) -> bool:
        # Write your code here
        return False
`,
      javascript: `class Solution {
    isValid(s) {
        // Write your code here
        return false;
    }
}
`,
      cpp: `#include <string>

class Solution {
public:
    bool isValid(std::string s) {
        // Write your code here
        return false;
    }
};
`
    },
    testRunner: {
      python: `
# Test runner assertions
try:
    sol = Solution()
    
    if not sol.isValid("()"):
        raise ValueError("Expected True for s='()'")
        
    if not sol.isValid("()[]{}"):
        raise ValueError("Expected True for s='()[]{}'")
        
    if sol.isValid("(]"):
        raise ValueError("Expected False for s='(]'")
        
    if sol.isValid("([)]"):
        raise ValueError("Expected False for s='([)]'")
        
    print("__SUCCESS__")
except Exception as e:
    print(f"__FAILED__: {str(e)}")
`,
      javascript: `
// Test runner assertions
try {
    const sol = new Solution();
    
    if (sol.isValid("()") !== true) throw new Error("Expected true for s='()'");
    if (sol.isValid("()[]{}") !== true) throw new Error("Expected true for s='()[]{}'");
    if (sol.isValid("(]") !== false) throw new Error("Expected false for s='(]'");
    if (sol.isValid("([)]") !== false) throw new Error("Expected false for s='([)]'");
    
    console.log("__SUCCESS__");
} catch(e) {
    console.log("__FAILED__: " + e.message);
}
`,
      cpp: `
#include <iostream>

int main() {
    Solution sol;
    
    if (!sol.isValid("()")) {
        std::cout << "__FAILED__: Expected true for s='()'" << std::endl;
        return 0;
    }
    if (!sol.isValid("()[]{}")) {
        std::cout << "__FAILED__: Expected true for s='()[]{}'" << std::endl;
        return 0;
    }
    if (sol.isValid("(]")) {
        std::cout << "__FAILED__: Expected false for s='(]'" << std::endl;
        return 0;
    }
    
    std::cout << "__SUCCESS__" << std::endl;
    return 0;
}
`
    }
  },
  {
    id: "540",
    title: "Single Element in a Sorted Array",
    difficulty: "medium",
    acceptance: "31.2%",
    category: "Binary Search",
    description: `You are given a sorted array consisting of only integers where every element appears exactly twice, except for one element which appears exactly once.

*Find this single element that appears only once.*

Your solution must run in \`O(log n)\` time and \`O(1)\` space.

### Example 1:
\`\`\`text
Input: nums = [1,1,2,3,3,4,4,8,8]
Output: 2
\`\`\`

### Example 2:
\`\`\`text
Input: nums = [3,3,7,7,10,11,11]
Output: 10
\`\`\`

### Constraints:
- \`1 <= nums.length <= 10^5\`
- \`0 <= nums[i] <= 10^5\``,
    starterCode: {
      python: `class Solution:
    def singleNonDuplicate(self, nums: list[int]) -> int:
        # Write your code here
        return 0
`,
      javascript: `class Solution {
    singleNonDuplicate(nums) {
        // Write your code here
        return 0;
    }
}
`,
      cpp: `#include <vector>

class Solution {
public:
    int singleNonDuplicate(std::vector<int>& nums) {
        // Write your code here
        return 0;
    }
};
`
    },
    testRunner: {
      python: `
try:
    sol = Solution()
    
    r1 = sol.singleNonDuplicate([1,1,2,3,3,4,4,8,8])
    if r1 != 2:
        raise ValueError(f"Expected 2, got {r1}")
        
    r2 = sol.singleNonDuplicate([3,3,7,7,10,11,11])
    if r2 != 10:
        raise ValueError(f"Expected 10, got {r2}")
        
    print("__SUCCESS__")
except Exception as e:
    print(f"__FAILED__: {str(e)}")
`,
      javascript: `
try {
    const sol = new Solution();
    
    const r1 = sol.singleNonDuplicate([1,1,2,3,3,4,4,8,8]);
    if (r1 !== 2) throw new Error("Expected 2, got " + r1);
    
    const r2 = sol.singleNonDuplicate([3,3,7,7,10,11,11]);
    if (r2 !== 10) throw new Error("Expected 10, got " + r2);
    
    console.log("__SUCCESS__");
} catch(e) {
    console.log("__FAILED__: " + e.message);
}
`,
      cpp: `
#include <iostream>

int main() {
    Solution sol;
    
    std::vector<int> n1 = {1,1,2,3,3,4,4,8,8};
    if (sol.singleNonDuplicate(n1) != 2) {
        std::cout << "__FAILED__: Expected 2 for test case 1" << std::endl;
        return 0;
    }
    
    std::vector<int> n2 = {3,3,7,7,10,11,11};
    if (sol.singleNonDuplicate(n2) != 10) {
        std::cout << "__FAILED__: Expected 10 for test case 2" << std::endl;
        return 0;
    }
    
    std::cout << "__SUCCESS__" << std::endl;
    return 0;
}
`
    }
  },
  {
    id: "518",
    title: "Coin Change 2",
    difficulty: "medium",
    acceptance: "48.5%",
    category: "Dynamic Programming",
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return *the number of combinations that make up that amount*. If that amount of money cannot be made up by any combination of the coins, return \`0\`.

You may assume that you have an infinite number of each kind of coin.

The answer is **guaranteed** to fit in a signed 32-bit integer.

### Example 1:
\`\`\`text
Input: amount = 5, coins = [1,2,5]
Output: 4
Explanation: there are four ways to make up the amount:
5=5
5=2+2+1
5=2+1+1+1
5=1+1+1+1+1
\`\`\`

### Example 2:
\`\`\`text
Input: amount = 3, coins = [2]
Output: 0
Explanation: the amount of 3 cannot be made up just with coins of 2.
\`\`\`

### Example 3:
\`\`\`text
Input: amount = 10, coins = [10]
Output: 1
\`\`\`

### Constraints:
- \`1 <= coins.length <= 300\`
- \`1 <= coins[i] <= 5000\`
- All the values of \`coins\` are **unique**.
- \`0 <= amount <= 5000\``,
    starterCode: {
      python: `class Solution:
    def change(self, amount: int, coins: list[int]) -> int:
        # Write your code here
        return 0
`,
      javascript: `class Solution {
    change(amount, coins) {
        // Write your code here
        return 0;
    }
}
`,
      cpp: `#include <vector>

class Solution {
public:
    int change(int amount, std::vector<int>& coins) {
        // Write your code here
        return 0;
    }
};
`
    },
    testRunner: {
      python: `
try:
    sol = Solution()
    
    r1 = sol.change(5, [1, 2, 5])
    if r1 != 4:
        raise ValueError(f"Expected 4, got {r1}")
        
    r2 = sol.change(3, [2])
    if r2 != 0:
        raise ValueError(f"Expected 0, got {r2}")
        
    r3 = sol.change(10, [10])
    if r3 != 1:
        raise ValueError(f"Expected 1, got {r3}")
        
    print("__SUCCESS__")
except Exception as e:
    print(f"__FAILED__: {str(e)}")
`,
      javascript: `
try {
    const sol = new Solution();
    
    const r1 = sol.change(5, [1, 2, 5]);
    if (r1 !== 4) throw new Error("Expected 4, got " + r1);
    
    const r2 = sol.change(3, [2]);
    if (r2 !== 0) throw new Error("Expected 0, got " + r2);
    
    console.log("__SUCCESS__");
} catch(e) {
    console.log("__FAILED__: " + e.message);
}
`,
      cpp: `
#include <iostream>

int main() {
    Solution sol;
    
    std::vector<int> c1 = {1, 2, 5};
    if (sol.change(5, c1) != 4) {
        std::cout << "__FAILED__: Expected 4 for amount=5 coins=[1,2,5]" << std::endl;
        return 0;
    }
    
    std::vector<int> c2 = {2};
    if (sol.change(3, c2) != 0) {
        std::cout << "__FAILED__: Expected 0 for amount=3 coins=[2]" << std::endl;
        return 0;
    }
    
    std::cout << "__SUCCESS__" << std::endl;
    return 0;
}
`
    }
  },
  {
    id: "7",
    title: "Reverse Integer",
    difficulty: "easy",
    acceptance: "41.2%",
    category: "Math",
    description: `Given a signed 32-bit integer \`x\`, return \`x\` *with its digits reversed*. If reversing \`x\` causes the value to go outside the signed 32-bit integer range \`[-2^31, 2^31 - 1]\`, then return \`0\`.

**Assume the environment does not allow you to store 64-bit integers (signed or unsigned).**

### Example 1:
\`\`\`text
Input: x = 123
Output: 321
\`\`\`

### Example 2:
\`\`\`text
Input: x = -123
Output: -321
\`\`\`

### Example 3:
\`\`\`text
Input: x = 120
Output: 21
\`\`\`

### Constraints:
- \`-2^31 <= x <= 2^31 - 1\``,
    starterCode: {
      python: `class Solution:
    def reverse(self, x: int) -> int:
        # Write your code here
        return 0
`,
      javascript: `class Solution {
    reverse(x) {
        // Write your code here
        return 0;
    }
}
`,
      cpp: `class Solution {
public:
    int reverse(int x) {
        // Write your code here
        return 0;
    }
};
`
    },
    testRunner: {
      python: `
try:
    sol = Solution()
    
    r1 = sol.reverse(123)
    if r1 != 321: raise ValueError(f"Expected 321, got {r1}")
    
    r2 = sol.reverse(-123)
    if r2 != -321: raise ValueError(f"Expected -321, got {r2}")
    
    r3 = sol.reverse(120)
    if r3 != 21: raise ValueError(f"Expected 21, got {r3}")
    
    # Overflow check
    r4 = sol.reverse(1534236469)
    if r4 != 0: raise ValueError(f"Expected 0 on overflow, got {r4}")
    
    print("__SUCCESS__")
except Exception as e:
    print(f"__FAILED__: {str(e)}")
`,
      javascript: `
try {
    const sol = new Solution();
    
    const r1 = sol.reverse(123);
    if (r1 !== 321) throw new Error("Expected 321, got " + r1);
    
    const r2 = sol.reverse(-123);
    if (r2 !== -321) throw new Error("Expected -321, got " + r2);
    
    const r3 = sol.reverse(1534236469);
    if (r3 !== 0) throw new Error("Expected 0 on overflow, got " + r3);
    
    console.log("__SUCCESS__");
} catch(e) {
    console.log("__FAILED__: " + e.message);
}
`,
      cpp: `
#include <iostream>

int main() {
    Solution sol;
    
    if (sol.reverse(123) != 321) {
        std::cout << "__FAILED__: Expected 321 for x=123" << std::endl;
        return 0;
    }
    
    if (sol.reverse(-123) != -321) {
        std::cout << "__FAILED__: Expected -321 for x=-123" << std::endl;
        return 0;
    }
    
    if (sol.reverse(1534236469) != 0) {
        std::cout << "__FAILED__: Expected 0 on overflow" << std::endl;
        return 0;
    }
    
    std::cout << "__SUCCESS__" << std::endl;
    return 0;
}
`
    }
  }
];
