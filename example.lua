function foo(n)
    if n > 0 then
        return foo(n - 1)
    else
        return 0
    end
end

function bar(x, y)
    local sum = x + y
    return sum
end

local result = bar(5, 10)
